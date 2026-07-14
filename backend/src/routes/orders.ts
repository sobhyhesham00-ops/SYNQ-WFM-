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

const prisma = new PrismaClient();
export const orderRouter = Router();

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
  res.json({ business, drivers, orders });
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
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: req.params.id },
      data: { driverId, status: 'Assigned', assignedAt: new Date() },
    });
    await tx.driver.update({ where: { id: driverId }, data: { status: 'Delivering' } });
    return o;
  });
  pushDashboardEvent(req.auth!.restaurantId, { type: 'order_assigned', order });
  res.json(order);
});

// Driver marks picked up / delivered from the app.
orderRouter.post('/orders/:id/status', requireDriver, async (req, res) => {
  const { status } = req.body as { status: 'PickedUp' | 'Delivered' };
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
