import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";

// Augment Express Request with the authenticated user id/role.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
