/**
 * Order lifecycle over REST (transactional — money-adjacent state).
 * State changes are also pushed to the dashboard WS room so the map/drawer
 * update live.  (Blueprint §1.3 step 5)
 */
import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
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
  // Enforce the plan's driver cap — only active drivers count.
  const rid = req.auth!.restaurantId;
  const count = await prisma.driver.count({ where: { restaurantId: rid, active: true } });
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

// Deactivate / reactivate a driver (they left the business, or came back).
// Deactivated drivers can't log in and don't count against the plan cap.
orderRouter.patch('/drivers/:id', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const { active } = req.body as { active?: boolean };
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active (boolean) required' });

  const existing = await prisma.driver.findFirst({ where: { id: req.params.id, restaurantId: rid } });
  if (!existing) return res.status(404).json({ error: 'not found' });

  // Reactivating must respect the plan's active-driver cap.
  if (active && !existing.active) {
    const activeCount = await prisma.driver.count({ where: { restaurantId: rid, active: true } });
    if (activeCount >= planDriverCap(await planOf(rid))) {
      return res.status(402).json({ error: 'plan_upgrade_required', feature: 'driverCap' });
    }
  }

  const driver = await prisma.driver.update({
    where: { id: existing.id },
    data: { active, ...(active ? {} : { status: 'Offline' }) },
    select: { id: true, name: true, phone: true, status: true, active: true, currentLat: true, currentLng: true, lastSeenAt: true },
  });
  pushDashboardEvent(rid, { type: 'driver_updated', driver });
  res.json(driver);
});

// Reset a driver's PIN/password (they forgot it, or you're rotating it).
orderRouter.post('/drivers/:id/reset-pin', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const { password } = req.body as { password?: string };
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 characters' });
  }
  const existing = await prisma.driver.findFirst({ where: { id: req.params.id, restaurantId: rid } });
  if (!existing) return res.status(404).json({ error: 'not found' });
  await prisma.driver.update({ where: { id: existing.id }, data: { passwordHash: bcrypt.hashSync(password, 10) } });
  res.json({ ok: true });
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

// Owner daily-summary — a light end-of-day recap (available on every plan).
orderRouter.get('/summary/today', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const [biz, orders, deliveredUnsettled, drivers] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: rid }, select: { name: true } }),
    prisma.order.findMany({
      where: { restaurantId: rid, createdAt: { gte: startOfDay } },
      select: { status: true, totalCashToCollect: true },
    }),
    prisma.order.findMany({
      where: { restaurantId: rid, status: 'Delivered', settled: false },
      select: { totalCashToCollect: true },
    }),
    prisma.driver.findMany({ where: { restaurantId: rid }, select: { status: true } }),
  ]);

  const delivered = orders.filter((o) => o.status === 'Delivered');
  const collected = delivered.reduce((s, o) => s + o.totalCashToCollect, 0);
  const outstanding = deliveredUnsettled.reduce((s, o) => s + o.totalCashToCollect, 0);
  const egp = (p: number) => (p / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 });

  res.json({
    businessName: biz?.name ?? '',
    date: startOfDay.toISOString().slice(0, 10),
    deliveries: delivered.length,
    openOrders: orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length,
    collectedEGP: egp(collected),
    outstandingEGP: egp(outstanding),
    activeDrivers: drivers.filter((d) => d.status !== 'Offline').length,
    totalDrivers: drivers.length,
  });
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
        id: true, name: true, phone: true, status: true, active: true,
        currentLat: true, currentLng: true, lastSeenAt: true,
      },
      orderBy: { active: 'desc' },
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

// Order history with filters (status, driver, date range) + pagination.
// Unlike /state (live board), this includes Delivered/Failed/Cancelled.
orderRouter.get('/orders/history', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const { status, driverId, from, to } = req.query as Record<string, string | undefined>;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const where: Prisma.OrderWhereInput = { restaurantId: rid };
  const STATUSES = ['Pending', 'Assigned', 'PickedUp', 'Delivered', 'Failed', 'Cancelled'];
  if (status && STATUSES.includes(status)) where.status = status as (typeof STATUSES)[number] as never;
  if (driverId) where.driverId = driverId;
  if (from || to) {
    const range: Prisma.DateTimeFilter = {};
    if (from) { const d = new Date(from); if (!Number.isNaN(+d)) range.gte = d; }
    if (to) { const d = new Date(to); if (!Number.isNaN(+d)) { d.setHours(23, 59, 59, 999); range.lte = d; } }
    where.createdAt = range;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
    prisma.order.count({ where }),
  ]);
  res.json({ orders, total, limit, offset });
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

// Manager edits an order's details before it's completed (mistyped address,
// wrong amount, added landmark). A Delivered/Cancelled order is frozen.
orderRouter.patch('/orders/:id', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const existing = await prisma.order.findFirst({ where: { id: req.params.id, restaurantId: rid } });
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.status === 'Delivered' || existing.status === 'Cancelled') {
    return res.status(400).json({ error: 'cannot edit a completed order' });
  }

  const { customerAddress, landmark, customerPhone, notes, requiresPrescription, totalCashEGP } = req.body ?? {};
  const data: Prisma.OrderUpdateInput = {};
  if (customerAddress !== undefined) {
    if (typeof customerAddress !== 'string' || !customerAddress.trim()) {
      return res.status(400).json({ error: 'address cannot be empty' });
    }
    data.customerAddress = customerAddress.trim();
  }
  if (landmark !== undefined) data.landmark = landmark || null;
  if (customerPhone !== undefined) data.customerPhone = customerPhone || null;
  if (notes !== undefined) data.notes = notes || null;
  if (requiresPrescription !== undefined) data.requiresPrescription = Boolean(requiresPrescription);
  if (totalCashEGP !== undefined) {
    const n = Number(totalCashEGP);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'bad amount' });
    data.totalCashToCollect = Math.round(n * 100);
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'nothing to update' });

  const order = await prisma.order.update({ where: { id: existing.id }, data });
  pushDashboardEvent(rid, { type: 'order_updated', order });
  res.json(order);
});

// Manager assigns — or reassigns — an order to a driver.
orderRouter.post('/orders/:id/assign', requireManager, async (req, res) => {
  const rid = req.auth!.restaurantId;
  const { driverId } = req.body as { driverId?: string };
  if (!driverId) return res.status(400).json({ error: 'driverId required' });

  const existing = await prisma.order.findFirst({ where: { id: req.params.id, restaurantId: rid } });
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.status === 'Delivered') return res.status(400).json({ error: 'order already delivered' });
  if (existing.status === 'Cancelled') return res.status(400).json({ error: 'order is cancelled' });

  // The target driver must belong to this restaurant.
  const driver = await prisma.driver.findFirst({ where: { id: driverId, restaurantId: rid } });
  if (!driver) return res.status(404).json({ error: 'driver not found' });

  const prevDriverId = existing.driverId;
  const otp = String(Math.floor(1000 + Math.random() * 9000)); // fresh handover code

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: existing.id },
      data: { driverId, status: 'Assigned', assignedAt: new Date(), deliveryOtp: otp },
    });
    await tx.driver.update({ where: { id: driverId }, data: { status: 'Delivering' } });
    // Reassignment: free the previous driver if this was their only live order.
    if (prevDriverId && prevDriverId !== driverId) {
      const stillActive = await tx.order.count({
        where: { driverId: prevDriverId, status: { in: ['Assigned', 'PickedUp'] } },
      });
      if (stillActive === 0) {
        await tx.driver.update({ where: { id: prevDriverId }, data: { status: 'Idle' } });
      }
    }
    return o;
  });

  // Ping the (new) assigned driver's device.
  const fcm = await prisma.driver.findUnique({ where: { id: driverId }, select: { fcmToken: true } });
  pushTo([fcm?.fcmToken], 'طلب جديد · New order', order.customerAddress);
  pushDashboardEvent(rid, { type: 'order_assigned', order });
  res.json(order);
});

// Driver updates their own order: picked up, delivered (OTP), or failed.
orderRouter.post('/orders/:id/status', requireDriver, async (req, res) => {
  const { status, otp, reason } = req.body as {
    status: 'PickedUp' | 'Delivered' | 'Failed'; otp?: string; reason?: string;
  };
  if (!['PickedUp', 'Delivered', 'Failed'].includes(status)) {
    return res.status(400).json({ error: 'bad status' });
  }

  // A driver may only update an order that is actually assigned to them.
  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, driverId: req.auth!.driverId },
  });
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.status === 'Delivered' || existing.status === 'Cancelled') {
    return res.status(400).json({ error: 'order already closed' });
  }

  // Delivered requires the customer's handover code (anti-dispute proof).
  if (status === 'Delivered' && existing.deliveryOtp && existing.deliveryOtp !== String(otp ?? '').trim()) {
    return res.status(400).json({ error: 'wrong_otp' });
  }

  const trimmedReason = (reason ?? '').trim();
  const order = await prisma.order.update({
    where: { id: existing.id },
    data: {
      status,
      ...(status === 'Delivered' ? { deliveredAt: new Date() } : {}),
      ...(status === 'Failed' && trimmedReason
        ? { notes: `${existing.notes ? existing.notes + ' · ' : ''}Failed: ${trimmedReason}` }
        : {}),
    },
  });

  // Delivered or Failed closes the driver's involvement — free them if idle.
  if ((status === 'Delivered' || status === 'Failed') && order.driverId) {
    const active = await prisma.order.count({
      where: { driverId: order.driverId, status: { in: ['Assigned', 'PickedUp'] } },
    });
    if (active === 0) {
      await prisma.driver.update({ where: { id: order.driverId }, data: { status: 'Idle' } });
    }
  }

  // Push refreshed cash drawer so the manager sees the new amount owed live.
  const drawer = order.driverId ? await getDriverCashDrawer(order.driverId) : null;
  pushDashboardEvent(order.restaurantId, { type: 'order_status', order, drawer });
  res.json(order);
});

// Manager cancels/voids an order before it's delivered (wrong order, customer
// cancelled, duplicate). A Delivered order can't be cancelled — its cash is
// already in the drawer.
orderRouter.post('/orders/:id/cancel', requireManager, async (req, res) => {
  const { reason } = (req.body ?? {}) as { reason?: string };
  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, restaurantId: req.auth!.restaurantId },
  });
  if (!existing) return res.status(404).json({ error: 'not found' });
  if (existing.status === 'Delivered') return res.status(400).json({ error: 'cannot cancel a delivered order' });
  if (existing.status === 'Cancelled') return res.status(409).json({ error: 'already cancelled' });

  const trimmed = (reason ?? '').trim();
  const order = await prisma.order.update({
    where: { id: existing.id },
    data: {
      status: 'Cancelled',
      notes: trimmed
        ? `${existing.notes ? existing.notes + ' · ' : ''}Cancelled: ${trimmed}`
        : existing.notes,
    },
  });

  // Free the driver if this was their only live order.
  if (existing.driverId) {
    const active = await prisma.order.count({
      where: { driverId: existing.driverId, status: { in: ['Assigned', 'PickedUp'] } },
    });
    if (active === 0) {
      await prisma.driver.update({ where: { id: existing.driverId }, data: { status: 'Idle' } });
    }
  }

  pushDashboardEvent(req.auth!.restaurantId, { type: 'order_cancelled', order });
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
