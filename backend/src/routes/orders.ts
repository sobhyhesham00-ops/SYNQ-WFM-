/**
 * Order lifecycle over REST (transactional — money-adjacent state).
 * State changes are also pushed to the dashboard WS room so the map/drawer
 * update live.  (Blueprint §1.3 step 5)
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pushDashboardEvent } from '../ws/tracking';
import { getDriverCashDrawer, settleDriverCash } from '../services/cashDrawer';
import { requireManager, requireDriver } from '../services/auth';
import { pushTo } from '../services/notify';

const prisma = new PrismaClient();
export const orderRouter = Router();

// "Find a Captain" directory — captains from OTHER merchants who opted in to be
// hired. Pure discovery: returns contact + rating + distance so the manager can
// call/WhatsApp them directly. No assignment, no money, no commission here.
orderRouter.get('/captains/available', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const shop = await prisma.restaurant.findUnique({
    where: { id: rid }, select: { shopLat: true, shopLng: true },
  });

  const captains = await prisma.driver.findMany({
    where: { availableForHire: true, restaurantId: { not: rid } },
    select: {
      id: true, name: true, phone: true, city: true, vehicle: true,
      currentLat: true, currentLng: true, status: true,
    },
  });

  // Average rating per captain.
  const ratings = await prisma.order.groupBy({
    by: ['driverId'],
    where: { rating: { not: null }, driverId: { in: captains.map((c) => c.id) } },
    _avg: { rating: true }, _count: { rating: true },
  });
  const rBy = new Map(ratings.map((r) => [r.driverId, { avg: r._avg.rating, count: r._count.rating }]));

  const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const out = captains.map((c) => ({
    id: c.id, name: c.name, phone: c.phone, city: c.city, vehicle: c.vehicle,
    online: c.status !== 'Offline',
    rating: rBy.get(c.id)?.avg ?? null,
    ratingCount: rBy.get(c.id)?.count ?? 0,
    distanceKm: shop?.shopLat != null && c.currentLat != null
      ? Math.round(km({ lat: shop.shopLat!, lng: shop.shopLng! }, { lat: c.currentLat!, lng: c.currentLng! }) * 10) / 10
      : null,
  })).sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));

  res.json(out);
});

// Onboarding: add a driver to the fleet (name + phone + PIN).
orderRouter.post('/drivers', requireManager, async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'missing fields' });
  const exists = await prisma.driver.findFirst({ where: { phone } });
  if (exists) return res.status(409).json({ error: 'phone already registered' });
  const driver = await prisma.driver.create({
    data: {
      restaurantId: req.auth!.restaurantId,
      name, phone,
      passwordHash: bcrypt.hashSync(password, 10),
      status: 'Offline',
    },
    select: { id: true, name: true, phone: true, status: true, currentLat: true, currentLng: true, lastSeenAt: true },
  });
  pushDashboardEvent(req.auth!.restaurantId, { type: 'driver_added', driver });
  res.status(201).json(driver);
});

// Weekly cash report as CSV (for the owner's books). ?days=7 (default).
orderRouter.get('/reports/cash.csv', requireManager, async (req, res) => {
  const days = Math.min(Number(req.query.days) || 7, 90);
  const since = new Date(Date.now() - days * 86400_000);
  const orders = await prisma.order.findMany({
    where: { restaurantId: req.auth!.restaurantId, status: 'Delivered', deliveredAt: { gte: since } },
    orderBy: { deliveredAt: 'desc' },
    select: {
      deliveredAt: true, customerAddress: true, totalCashToCollect: true,
      settled: true, rating: true, driver: { select: { name: true } },
    },
  });
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [
    ['date', 'driver', 'address', 'amount_egp', 'settled', 'rating'].join(','),
    ...orders.map((o) => [
      o.deliveredAt?.toISOString().slice(0, 10) ?? '',
      esc(o.driver?.name ?? ''),
      esc(o.customerAddress),
      (o.totalCashToCollect / 100).toFixed(2),
      o.settled ? 'yes' : 'no',
      o.rating ?? '',
    ].join(',')),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="meshwar-cash-${days}d.csv"`);
  res.send(rows.join('\n'));
});

// Today's analytics for the dashboard strip.
orderRouter.get('/analytics', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { restaurantId: rid, createdAt: { gte: startOfDay } },
    select: { status: true, totalCashToCollect: true, settled: true, assignedAt: true, deliveredAt: true },
  });

  const delivered = orders.filter((o) => o.status === 'Delivered');
  const collected = delivered.reduce((s, o) => s + o.totalCashToCollect, 0);
  const settled = delivered.filter((o) => o.settled).reduce((s, o) => s + o.totalCashToCollect, 0);

  // Average delivery time = deliveredAt - assignedAt, in minutes.
  const times = delivered
    .filter((o) => o.assignedAt && o.deliveredAt)
    .map((o) => (o.deliveredAt!.getTime() - o.assignedAt!.getTime()) / 60000);
  const avgMinutes = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  const egp = (p: number) => (p / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 });
  res.json({
    ordersToday: orders.length,
    deliveredToday: delivered.length,
    avgDeliveryMinutes: avgMinutes,
    collectedEGP: egp(collected),
    outstandingEGP: egp(collected - settled),
  });
});

// Update business settings (Ramadan mode + iftar time).
orderRouter.patch('/business', requireManager, async (req, res) => {
  const { ramadanMode, iftarTime } = req.body;
  const data: { ramadanMode?: boolean; iftarTime?: string | null } = {};
  if (typeof ramadanMode === 'boolean') data.ramadanMode = ramadanMode;
  if (iftarTime !== undefined) data.iftarTime = iftarTime || null;
  const biz = await prisma.restaurant.update({
    where: { id: req.auth!.restaurantId },
    data,
    select: { name: true, businessType: true, ramadanMode: true, iftarTime: true },
  });
  res.json(biz);
});

// Route replay: a driver's location history for the map polyline.
// Optional ?from=ISO&to=ISO time window; defaults to the last 4 hours.
orderRouter.get('/drivers/:id/route', requireManager, async (req, res) => {
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const from = req.query.from
    ? new Date(String(req.query.from))
    : new Date(to.getTime() - 4 * 60 * 60 * 1000);

  const points = await prisma.locationLog.findMany({
    where: { driverId: req.params.id, timestamp: { gte: from, lte: to } },
    select: { lat: true, lng: true, timestamp: true },
    orderBy: { timestamp: 'asc' },
  });
  res.json({ driverId: req.params.id, from, to, points });
});

// Dashboard bootstrap: current drivers (with last position) + open orders.
// The live WS stream takes over from here for incremental updates.
orderRouter.get('/state', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const [business, drivers, orders] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: rid },
      select: { name: true, businessType: true, ramadanMode: true, iftarTime: true, shopLat: true, shopLng: true },
    }),
    prisma.driver.findMany({
      where: { restaurantId: rid },
      select: {
        id: true, name: true, phone: true, status: true,
        currentLat: true, currentLng: true, lastSeenAt: true,
      },
    }),
    prisma.order.findMany({
      where: { restaurantId: rid, status: { not: 'Cancelled' } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Average customer rating per driver (from rated, delivered orders).
  const ratings = await prisma.order.groupBy({
    by: ['driverId'],
    where: { restaurantId: rid, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const ratingBy = new Map(ratings.map((r) => [r.driverId, { avg: r._avg.rating, count: r._count.rating }]));
  const driversWithRating = drivers.map((d) => ({
    ...d,
    rating: ratingBy.get(d.id)?.avg ?? null,
    ratingCount: ratingBy.get(d.id)?.count ?? 0,
  }));

  res.json({ business, drivers: driversWithRating, orders });
});

// Manager creates an order. Amount arrives in EGP; store as piastres.
orderRouter.post('/orders', requireManager, async (req, res) => {
  const { customerAddress, customerPhone, landmark, notes, requiresPrescription, totalCashEGP } = req.body;
  const order = await prisma.order.create({
    data: {
      restaurantId: req.auth!.restaurantId,
      customerAddress,
      customerPhone,
      landmark,
      notes,
      requiresPrescription: Boolean(requiresPrescription),
      totalCashToCollect: Math.round(Number(totalCashEGP) * 100),
    },
  });
  pushDashboardEvent(req.auth!.restaurantId, { type: 'order_created', order });
  res.status(201).json(order);
});

// Manager assigns an order to a driver.
orderRouter.post('/orders/:id/assign', requireManager, async (req, res) => {
  const { driverId } = req.body;
  const otp = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit handover code
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: req.params.id },
      data: { driverId, status: 'Assigned', assignedAt: new Date(), deliveryOtp: otp },
    });
    await tx.driver.update({ where: { id: driverId }, data: { status: 'Delivering' } });
    return o;
  });
  // Ping the assigned driver's device (new job).
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { fcmToken: true } });
  pushTo([driver?.fcmToken], 'طلب جديد · New order', order.customerAddress);
  pushDashboardEvent(req.auth!.restaurantId, { type: 'order_assigned', order });
  res.json(order);
});

// Driver marks picked up / delivered from the app.
orderRouter.post('/orders/:id/status', requireDriver, async (req, res) => {
  const { status, otp } = req.body as { status: 'PickedUp' | 'Delivered'; otp?: string };

  // Delivered requires the customer's handover code (anti-dispute proof).
  if (status === 'Delivered') {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id }, select: { deliveryOtp: true },
    });
    if (existing?.deliveryOtp && existing.deliveryOtp !== String(otp ?? '').trim()) {
      return res.status(400).json({ error: 'wrong_otp' });
    }
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(status === 'Delivered' ? { deliveredAt: new Date() } : {}),
    },
  });

  // If the driver has no more active orders, flip them back to Idle.
  if (status === 'Delivered') {
    const active = await prisma.order.count({
      where: { driverId: order.driverId!, status: { in: ['Assigned', 'PickedUp'] } },
    });
    if (active === 0 && order.driverId) {
      await prisma.driver.update({ where: { id: order.driverId }, data: { status: 'Idle' } });
    }
  }

  // Push refreshed cash drawer so the manager sees the new amount owed live.
  const drawer = order.driverId ? await getDriverCashDrawer(order.driverId) : null;
  pushDashboardEvent(order.restaurantId, { type: 'order_status', order, drawer });
  res.json(order);
});

// Cashier settles a driver's cash at end of shift.
orderRouter.post('/drivers/:id/settle', requireManager, async (req, res) => {
  const result = await settleDriverCash(req.params.id);
  pushDashboardEvent(req.auth!.restaurantId, {
    type: 'cash_settled',
    driverId: req.params.id,
    ...result,
  });
  res.json(result);
});
