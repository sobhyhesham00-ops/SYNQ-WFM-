/**
 * Account self-service deletion.
 *
 * Google Play (and basic good practice) requires a way for a user to delete
 * their account and all associated data. A manager can delete their entire
 * business — every driver, order, location log, payment, and staff login —
 * after re-entering their password. This is irreversible.
 *
 * The schema has no ON DELETE CASCADE, so children are removed in dependency
 * order inside a single transaction (orders/logs reference drivers; everything
 * references the restaurant).
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireManager } from '../services/auth';

const prisma = new PrismaClient();
export const accountRouter = Router();

accountRouter.delete('/business/account', requireManager, async (req, res) => {
  const password = String(req.body?.password ?? '');
  const managerId = req.auth!.managerId!;
  const restaurantId = req.auth!.restaurantId;

  // Re-authenticate: a destructive, irreversible action needs the password
  // again, not just a valid session token.
  const user = await prisma.managerUser.findUnique({ where: { id: managerId } });
  if (!user) return res.status(404).json({ error: 'not found' });
  if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(403).json({ error: 'wrong_password' });
  }

  await prisma.$transaction([
    prisma.locationLog.deleteMany({ where: { driver: { restaurantId } } }),
    prisma.order.deleteMany({ where: { restaurantId } }),
    prisma.payment.deleteMany({ where: { restaurantId } }),
    prisma.driver.deleteMany({ where: { restaurantId } }),
    prisma.managerUser.deleteMany({ where: { restaurantId } }),
    prisma.restaurant.delete({ where: { id: restaurantId } }),
  ]);

  res.json({ deleted: true });
});
