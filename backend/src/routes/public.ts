/**
 * Public, unauthenticated customer tracking.  (Share a driver's live location.)
 * The link is /t/:token — the token is the order's opaque publicToken, so a
 * customer can watch their driver approach without any login.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const publicRouter = Router();

// Map internal status -> customer-friendly stage.
const STAGE: Record<string, string> = {
  Pending: 'Order received',
  Assigned: 'Preparing your order',
  PickedUp: 'On the way',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};

publicRouter.get('/track/:token', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { publicToken: req.params.token },
    select: {
      status: true,
      customerAddress: true,
      totalCashToCollect: true,
      deliveryOtp: true,
      rating: true,
      restaurant: { select: { name: true, businessType: true, phone: true } },
      driver: {
        select: { name: true, currentLat: true, currentLng: true, lastSeenAt: true },
      },
    },
  });
  if (!order) return res.status(404).json({ error: 'not found' });

  // Only expose the driver's live position while the order is in flight.
  const inFlight = order.status === 'Assigned' || order.status === 'PickedUp';
  res.json({
    stage: STAGE[order.status] ?? order.status,
    status: order.status,
    businessName: order.restaurant.name,
    businessType: order.restaurant.businessType, // Restaurant | Takeaway | Pharmacy
    businessPhone: order.restaurant.phone,
    customerAddress: order.customerAddress, // never itemized contents (privacy)
    cashToPayEGP: (order.totalCashToCollect / 100).toFixed(2),
    // Customer shows this code to the driver at handover; hidden once delivered.
    deliveryCode: inFlight ? order.deliveryOtp : null,
    canRate: order.status === 'Delivered' && order.rating == null,
    rating: order.rating,
    driver: inFlight && order.driver
      ? {
          name: order.driver.name,
          lat: order.driver.currentLat,
          lng: order.driver.currentLng,
          lastSeenAt: order.driver.lastSeenAt,
        }
      : null,
  });
});

// Customer rates the driver after delivery (1–5). Public, one-time.
publicRouter.post('/track/:token/rate', async (req, res) => {
  const rating = Number(req.body?.rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'rating 1-5' });
  const order = await prisma.order.findUnique({
    where: { publicToken: req.params.token },
    select: { id: true, status: true, rating: true },
  });
  if (!order || order.status !== 'Delivered') return res.status(400).json({ error: 'not delivered' });
  if (order.rating != null) return res.status(409).json({ error: 'already rated' });
  await prisma.order.update({ where: { id: order.id }, data: { rating, ratedAt: new Date() } });
  res.json({ ok: true, rating });
});
