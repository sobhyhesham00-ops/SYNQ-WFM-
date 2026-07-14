/**
 * Auth stubs — JWT-based. Fill in with your secret + real signing.
 * Kept minimal so the blueprint compiles conceptually; harden before prod
 * (rotate secrets, short-lived access tokens, refresh tokens for the app).
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-only-change-me';

export interface AuthContext {
  restaurantId: string;
  driverId?: string;
  managerId?: string;
  role?: 'manager' | 'cashier' | 'driver';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function verifyDriverToken(token: string) {
  const p = jwt.verify(token, SECRET) as AuthContext;
  if (!p.driverId) throw new Error('not a driver token');
  return { driverId: p.driverId, restaurantId: p.restaurantId };
}

export async function verifyDashboardToken(token: string) {
  const p = jwt.verify(token, SECRET) as AuthContext;
  if (!p.managerId) throw new Error('not a manager token');
  return { restaurantId: p.restaurantId };
}

function verify(req: Request): AuthContext {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '');
  return jwt.verify(token, SECRET) as AuthContext;
}

export function requireManager(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = verify(req);
    if (!auth.managerId) return res.status(403).json({ error: 'manager only' });
    req.auth = auth;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

export function requireDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = verify(req);
    if (!auth.driverId) return res.status(403).json({ error: 'driver only' });
    req.auth = auth;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
