/**
 * Auth routes — real login for managers/cashiers and drivers.
 * Issues short-lived JWTs consumed by requireManager/requireDriver and the WS
 * upgrade handshake.  (Blueprint §1 auth)
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import type { AuthContext } from '../services/auth';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me';
const TTL = '12h'; // one work shift

export const authRouter = Router();

function sign(ctx: AuthContext): string {
  return jwt.sign(ctx, SECRET, { expiresIn: TTL });
}

const BUSINESS_TYPES = ['Restaurant', 'Takeaway', 'Pharmacy', 'Grocery', 'Minimarket', 'Kiosk', 'Other'];

// Merchant self-signup: creates the business + its first manager, auto-logs in.
authRouter.post('/auth/manager/register', async (req, res) => {
  const { businessName, businessType, phone, managerName, email, password } = req.body;
  if (!businessName || !email || !password || !managerName) {
    return res.status(400).json({ error: 'missing fields' });
  }
  if (!BUSINESS_TYPES.includes(businessType)) {
    return res.status(400).json({ error: 'invalid businessType' });
  }
  const existing = await prisma.managerUser.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'email already registered' });

  const result = await prisma.$transaction(async (tx) => {
    const biz = await tx.restaurant.create({
      data: { name: businessName, phone, businessType },
    });
    const user = await tx.managerUser.create({
      data: {
        restaurantId: biz.id,
        name: managerName,
        email,
        passwordHash: bcrypt.hashSync(password, 10),
        role: 'manager',
      },
    });
    return { biz, user };
  });

  const token = sign({
    restaurantId: result.biz.id,
    managerId: result.user.id,
    role: 'manager',
  });
  res.status(201).json({
    token,
    name: result.user.name,
    businessName: result.biz.name,
    businessType: result.biz.businessType,
  });
});

// Manager / cashier login (web dashboard).
authRouter.post('/auth/manager/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.managerUser.findUnique({
    where: { email },
    include: { restaurant: { select: { name: true, businessType: true, ramadanMode: true, iftarTime: true } } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = sign({
    restaurantId: user.restaurantId,
    managerId: user.id,
    role: user.role as 'manager' | 'cashier',
  });
  res.json({
    token,
    name: user.name,
    role: user.role,
    businessName: user.restaurant.name,
    businessType: user.restaurant.businessType,
  });
});

// Driver login (mobile app) — phone + PIN/password.
authRouter.post('/auth/driver/login', async (req, res) => {
  const { phone, password } = req.body;
  const driver = await prisma.driver.findFirst({ where: { phone } });
  if (!driver || !(await bcrypt.compare(password, driver.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = sign({
    restaurantId: driver.restaurantId,
    driverId: driver.id,
    role: 'driver',
  });
  res.json({ token, name: driver.name });
});
