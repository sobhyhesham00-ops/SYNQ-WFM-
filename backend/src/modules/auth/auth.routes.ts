import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { HttpError } from "../../middleware/error";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(32),
  primaryLanguage: z.string().min(2).max(8).optional(),
  countryCode: z.string().length(2).optional(),
});

// Register — also bootstraps wallet, level stats, presence, and an empty loadout.
// (In production, prefer phone/email OTP + social login; password kept here for a runnable demo.)
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        profile: {
          create: {
            displayName: body.displayName,
            primaryLanguage: body.primaryLanguage,
            countryCode: body.countryCode,
          },
        },
        wallet: { create: {} },
        levelStats: { create: {} },
        presence: { create: {} },
        loadout: { create: {} },
      },
      include: { profile: true },
    });

    return res.status(201).json(issueTokens(user.id, user.role, user.profile?.displayName));
  } catch (e) {
    next(e);
  }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { profile: true },
    });
    if (!user?.passwordHash) throw new HttpError(401, "Invalid credentials");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid credentials");
    return res.json(issueTokens(user.id, user.role, user.profile?.displayName));
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = z.object({ refreshToken: z.string() }).parse(req.body).refreshToken;
    const payload = verifyRefreshToken(token);
    return res.json({ accessToken: signAccessToken({ sub: payload.sub, role: payload.role }) });
  } catch {
    next(new HttpError(401, "Invalid refresh token"));
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: { include: { languages: true } }, wallet: true, levelStats: true, presence: true },
    });
    if (!user) throw new HttpError(404, "User not found");
    return res.json(serializeMe(user));
  } catch (e) {
    next(e);
  }
});

function issueTokens(userId: string, role: string, displayName?: string) {
  return {
    accessToken: signAccessToken({ sub: userId, role }),
    refreshToken: signRefreshToken({ sub: userId, role }),
    user: { id: userId, role, displayName },
  };
}

// BigInt fields can't be JSON-serialized directly — stringify balances/XP.
function serializeMe(user: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    verified: user.verified,
    profile: user.profile,
    presence: user.presence,
    wallet: user.wallet
      ? { coins: user.wallet.coins.toString(), diamonds: user.wallet.diamonds.toString() }
      : null,
    levelStats: user.levelStats
      ? {
          charmLevel: user.levelStats.charmLevel,
          wealthLevel: user.levelStats.wealthLevel,
          activityLevel: user.levelStats.activityLevel,
          streakDays: user.levelStats.streakDays,
        }
      : null,
  };
}
