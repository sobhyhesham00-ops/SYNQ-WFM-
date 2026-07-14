/**
 * Order lifecycle over REST (transactional — money-adjacent state).
 * State changes are also pushed to the dashboard WS room so the map/drawer
 * update live.  (Blueprint §1.3 step 5)
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { pushDashboardEvent } from '../ws/tracking';
import { getDriverCashDrawer, settleDriverCash } from '../services/cashDrawer';
import { requireManager, requireDriver } from '../services/auth';

const prisma = new PrismaClient();
export const orderRouter = Router();

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
      select: { name: true, businessType: true },
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
