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
