/**
 * Driver-facing endpoints (mobile app). Auth = driver JWT.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireDriver } from '../services/auth';

const prisma = new PrismaClient();
export const driverRouter = Router();

const egp = (piastres: number) =>
  (piastres / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 });

const egpNum = (piastres: number) => (piastres / 100).toFixed(2);

// The logged-in driver's active + recent orders (mobile home screen).
driverRouter.get('/driver/me/orders', requireDriver, async (req, res) => {
  const driverId = req.auth!.driverId!;
  const orders = await prisma.order.findMany({
    where: { driverId, status: { in: ['Assigned', 'PickedUp', 'Delivered'] } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, customerAddress: true, customerPhone: true, landmark: true,
      requiresPrescription: true, totalCashToCollect: true, status: true,
    },
  });
  res.json(orders.map((o) => ({
    id: o.id,
    address: o.customerAddress,
    phone: o.customerPhone,
    landmark: o.landmark,
    requiresPrescription: o.requiresPrescription,
    cashEGP: egpNum(o.totalCashToCollect),
    status: o.status,
  })));
});

// Earnings / COD summary for the logged-in driver's current shift (today).
//   collected  = cash from all delivered orders today
//   handedOver = of that, what's already been settled with the cashier
//   inHand     = what the driver is still carrying and owes
driverRouter.get('/driver/me/summary', requireDriver, async (req, res) => {
  const driverId = req.auth!.driverId!;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const delivered = await prisma.order.findMany({
    where: { driverId, status: 'Delivered', deliveredAt: { gte: startOfDay } },
    select: {
      id: true, customerAddress: true, totalCashToCollect: true,
      deliveredAt: true, settled: true,
    },
    orderBy: { deliveredAt: 'desc' },
  });

  const collected = delivered.reduce((s, o) => s + o.totalCashToCollect, 0);
  const handedOver = delivered.filter((o) => o.settled).reduce((s, o) => s + o.totalCashToCollect, 0);
  const inHand = collected - handedOver;

  res.json({
    deliveries: delivered.length,
    collectedEGP: egp(collected),
    handedOverEGP: egp(handedOver),
    inHandEGP: egp(inHand),
    orders: delivered.map((o) => ({
      id: o.id,
      address: o.customerAddress,
      amountEGP: egp(o.totalCashToCollect),
      deliveredAt: o.deliveredAt,
      settled: o.settled,
    })),
  });
});
