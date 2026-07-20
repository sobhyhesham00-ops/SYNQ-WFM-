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
import { rateLimit } from '../security';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me';
const ACCESS_TTL = '2h';   // dashboard access token — short, refreshed silently
const REFRESH_TTL = '30d'; // dashboard refresh token — one long login
const DRIVER_TTL = '12h';  // mobile has no refresh flow; keep a full shift

export const authRouter = Router();

// Throttle credential-stuffing: 8 login/register attempts per IP per 5 minutes.
const loginLimiter = rateLimit({ windowMs: 5 * 60_000, max: 8 });

function sign(ctx: AuthContext, ttl: string = ACCESS_TTL): string {
  return jwt.sign(ctx, SECRET, { expiresIn: ttl });
}

function signRefresh(ctx: AuthContext): string {
  return jwt.sign({ ...ctx, typ: 'refresh' }, SECRET, { expiresIn: REFRESH_TTL });
}

/** Access + refresh pair for dashboard sessions. */
function tokens(ctx: AuthContext): { token: string; refreshToken: string } {
  return { token: sign(ctx), refreshToken: signRefresh(ctx) };
}

// Exchange a valid refresh token for a fresh access token (silent re-auth).
authRouter.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: 'missing refreshToken' });
  try {
    const payload = jwt.verify(refreshToken, SECRET) as AuthContext & { typ?: string };
    if (payload.typ !== 'refresh') return res.status(401).json({ error: 'not a refresh token' });
    const { restaurantId, managerId, driverId, role } = payload;
    const token = sign({ restaurantId, managerId, driverId, role } as AuthContext);
    return res.json({ token });
  } catch {
    return res.status(401).json({ error: 'invalid refresh token' });
  }
});

const BUSINESS_TYPES = ['Restaurant', 'Takeaway', 'Pharmacy', 'Grocery', 'Minimarket', 'Kiosk', 'Other'];

// Merchant self-signup: creates the business + its first manager, auto-logs in.
authRouter.post('/auth/manager/register', loginLimiter, async (req, res) => {
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

  res.status(201).json({
    ...tokens({
      restaurantId: result.biz.id,
      managerId: result.user.id,
      role: 'manager',
    }),
    name: result.user.name,
    businessName: result.biz.name,
    businessType: result.biz.businessType,
  });
});

// Manager / cashier login (web dashboard).
authRouter.post('/auth/manager/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.managerUser.findUnique({
    where: { email },
    include: { restaurant: { select: { name: true, businessType: true, ramadanMode: true, iftarTime: true } } },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  res.json({
    ...tokens({
      restaurantId: user.restaurantId,
      managerId: user.id,
      role: user.role as 'manager' | 'cashier',
    }),
    name: user.name,
    role: user.role,
    businessName: user.restaurant.name,
    businessType: user.restaurant.businessType,
  });
});

// Driver login (mobile app) — phone + PIN/password.
authRouter.post('/auth/driver/login', loginLimiter, async (req, res) => {
  const { phone, password } = req.body;
  const driver = await prisma.driver.findFirst({ where: { phone } });
  if (!driver || !(await bcrypt.compare(password, driver.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  if (!driver.active) return res.status(403).json({ error: 'account disabled' });
  const token = sign({
    restaurantId: driver.restaurantId,
    driverId: driver.id,
    role: 'driver',
  }, DRIVER_TTL);
  res.json({ token, name: driver.name });
});
