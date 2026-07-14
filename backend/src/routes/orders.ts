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
import { planAllows, planDriverCap, PLAN_PRICE, type Plan, type Feature } from '../services/plans';

const prisma = new PrismaClient();
export const orderRouter = Router();

const planOf = async (rid: string): Promise<Plan> => {
  const r = await prisma.restaurant.findUnique({ where: { id: rid }, select: { plan: true } });
  return (r?.plan ?? 'Free') as Plan;
};
// Returns true if allowed; otherwise writes a 402 and returns false.
async function gate(res: import('express').Response, rid: string, f: Feature): Promise<boolean> {
  if (planAllows(await planOf(rid), f)) return true;
  res.status(402).json({ error: 'plan_upgrade_required', feature: f });
  return false;
}

// Onboarding: add a driver to the fleet (name + phone + PIN).
orderRouter.post('/drivers', requireManager, async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'missing fields' });
  // Enforce the plan's driver cap (existing drivers are grandfathered).
  const rid = req.auth!.restaurantId;
  const count = await prisma.driver.count({ where: { restaurantId: rid } });
  if (count >= planDriverCap(await planOf(rid))) {
    return res.status(402).json({ error: 'plan_upgrade_required', feature: 'driverCap' });
  }
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
  if (!(await gate(res, req.auth!.restaurantId, 'csv'))) return;
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

// Driver-performance leaderboard over the last N days (default 7). Growth+ only.
orderRouter.get('/leaderboard', requireManager, async (req, res) => {
  if (!(await gate(res, req.auth!.restaurantId, 'analytics'))) return;
  const rid = req.auth!.restaurantId;
  const days = Math.min(Number(req.query.days) || 7, 90);
  const since = new Date(Date.now() - days * 86400_000);

  const [drivers, delivered, ratings] = await Promise.all([
    prisma.driver.findMany({ where: { restaurantId: rid }, select: { id: true, name: true } }),
    prisma.order.findMany({
      where: { restaurantId: rid, status: 'Delivered', deliveredAt: { gte: since } },
      select: { driverId: true, totalCashToCollect: true, assignedAt: true, deliveredAt: true },
    }),
    prisma.order.groupBy({
      by: ['driverId'], where: { restaurantId: rid, rating: { not: null } },
      _avg: { rating: true }, _count: { rating: true },
    }),
  ]);

  const rBy = new Map(ratings.map((r) => [r.driverId, { avg: r._avg.rating, count: r._count.rating }]));
  const stats = new Map(drivers.map((d) => [d.id, { name: d.name, count: 0, cash: 0, mins: [] as number[] }]));
  for (const o of delivered) {
    const s = o.driverId && stats.get(o.driverId);
    if (!s) continue;
    s.count += 1; s.cash += o.totalCashToCollect;
    if (o.assignedAt && o.deliveredAt) s.mins.push((o.deliveredAt.getTime() - o.assignedAt.getTime()) / 60000);
  }

  const egp = (p: number) => (p / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 });
  const board = [...stats.entries()]
    .map(([id, s]) => ({
      driverId: id, name: s.name, deliveries: s.count, collectedEGP: egp(s.cash),
      avgMinutes: s.mins.length ? Math.round(s.mins.reduce((a, b) => a + b, 0) / s.mins.length) : null,
      rating: rBy.get(id)?.avg ?? null,
    }))
    .filter((r) => r.deliveries > 0)
    .sort((a, b) => b.deliveries - a.deliveries || (b.rating ?? 0) - (a.rating ?? 0));

  res.json({ days, board });
});

// Today's analytics for the dashboard strip.
orderRouter.get('/analytics', requireManager, async (req, res) => {
  if (!(await gate(res, req.auth!.restaurantId, 'analytics'))) return;
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

// --- Billing (Fawry-style stub; no real PSP wired) ---
// Start a checkout: returns a payment reference + amount to pay out-of-band.
// In production a Fawry webhook would confirm; here /confirm simulates it.
// El Kaptin's own receiving accounts (where merchants send the fee). Placeholders.
const PAYEES = { vodafone: '010 0055 5777', instapay: 'elkaptin@instapay' };

// Annual = pay for 10 months, get 12 (2 months free).
const cyclePiastres = (plan: Plan, cycle: string) => PLAN_PRICE[plan] * (cycle === 'annual' ? 10 : 1);

orderRouter.post('/billing/checkout', requireManager, async (req, res) => {
  const plan = req.body?.plan as Plan;
  const method = (req.body?.method as 'fawry' | 'vodafone' | 'instapay') || 'fawry';
  const cycle = req.body?.cycle === 'annual' ? 'annual' : 'monthly';
  if (!(plan in PLAN_PRICE)) return res.status(400).json({ error: 'bad plan' });
  if (plan === 'Free') { // downgrade is instant, no payment
    await prisma.restaurant.update({ where: { id: req.auth!.restaurantId }, data: { plan } });
    return res.json({ plan, free: true });
  }
  if (plan === 'Chain') return res.json({ plan, contactSales: true });

  // Money moves through the licensed wallet/PSP — we only issue a reference.
  const reference = String(Math.floor(100000000 + Math.random() * 899999999));
  const amountEGP = (cyclePiastres(plan, cycle) / 100).toFixed(2);
  res.json({
    plan, method, cycle, amountEGP, reference,
    payTo: method === 'fawry' ? null : PAYEES[method], // wallet number / InstaPay handle
  });
});

// Confirm payment (stub for the wallet webhook) → activate the plan + record a receipt.
orderRouter.post('/billing/confirm', requireManager, async (req, res) => {
  const plan = req.body?.plan as Plan;
  const method = String(req.body?.method ?? 'fawry');
  const cycle = req.body?.cycle === 'annual' ? 'annual' : 'monthly';
  const reference = String(req.body?.reference ?? '');
  if (!(plan in PLAN_PRICE)) return res.status(400).json({ error: 'bad plan' });
  const rid = req.auth!.restaurantId;
  await prisma.$transaction([
    prisma.restaurant.update({ where: { id: rid }, data: { plan } }),
    prisma.payment.create({
      data: { restaurantId: rid, plan, method, cycle, amount: cyclePiastres(plan, cycle), reference },
    }),
  ]);
  res.json({ ok: true, plan });
});

// Billing history (receipts) for the merchant's books.
orderRouter.get('/billing/history', requireManager, async (req, res) => {
  const rows = await prisma.payment.findMany({
    where: { restaurantId: req.auth!.restaurantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(rows.map((p) => ({
    id: p.id, plan: p.plan, method: p.method, cycle: p.cycle,
    amountEGP: (p.amount / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 }),
    reference: p.reference, date: p.createdAt.toISOString().slice(0, 10),
  })));
});

// Update business settings (Ramadan mode + iftar time + subscription plan).
orderRouter.patch('/business', requireManager, async (req, res) => {
  const { ramadanMode, iftarTime, plan } = req.body;
  const PLANS = ['Free', 'Starter', 'Growth', 'Chain'];
  // Enabling Ramadan mode requires the plan that includes it.
  if (ramadanMode === true && !(await gate(res, req.auth!.restaurantId, 'ramadan'))) return;
  const data: { ramadanMode?: boolean; iftarTime?: string | null; plan?: string } = {};
  if (typeof ramadanMode === 'boolean') data.ramadanMode = ramadanMode;
  if (iftarTime !== undefined) data.iftarTime = iftarTime || null;
  if (PLANS.includes(plan)) data.plan = plan;
  const biz = await prisma.restaurant.update({
    where: { id: req.auth!.restaurantId },
    data: data as never,
    select: { name: true, businessType: true, plan: true, ramadanMode: true, iftarTime: true },
  });
  res.json(biz);
});

// Route replay: a driver's location history for the map polyline.
// Optional ?from=ISO&to=ISO time window; defaults to the last 4 hours.
orderRouter.get('/drivers/:id/route', requireManager, async (req, res) => {
  if (!(await gate(res, req.auth!.restaurantId, 'routeReplay'))) return;
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
      select: { name: true, businessType: true, plan: true, ramadanMode: true, iftarTime: true, shopLat: true, shopLng: true },
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
  if (!(await gate(res, req.auth!.restaurantId, 'cashDrawer'))) return;
  const result = await settleDriverCash(req.params.id);
  pushDashboardEvent(req.auth!.restaurantId, {
    type: 'cash_settled',
    driverId: req.params.id,
    ...result,
  });
  res.json(result);
});
