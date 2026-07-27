import { Router } from "express";
import { z } from "zod";
import { PresenceStatus, Proficiency } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";

export const usersRouter = Router();

// ── Update profile (incl. languages) ────────────────────────────────────────────
const profileSchema = z.object({
  displayName: z.string().min(2).max(32).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional(),
  voiceIntroUrl: z.string().url().optional(),
  gender: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  vibeTags: z.array(z.string()).max(10).optional(),
  interests: z.array(z.string()).max(20).optional(),
  primaryLanguage: z.string().min(2).max(8).optional(),
  learningLanguages: z.array(z.string()).max(10).optional(),
  openToExchange: z.boolean().optional(),
});

usersRouter.patch("/me/profile", requireAuth, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const profile = await prisma.profile.update({ where: { userId: req.userId }, data: body });
    return res.json(profile);
  } catch (e) {
    next(e);
  }
});

// ── Set spoken languages (with proficiency) ─────────────────────────────────────
const languagesSchema = z.object({
  languages: z
    .array(z.object({ language: z.string().min(2).max(8), proficiency: z.nativeEnum(Proficiency) }))
    .max(15),
});

usersRouter.put("/me/languages", requireAuth, async (req, res, next) => {
  try {
    const { languages } = languagesSchema.parse(req.body);
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) throw new HttpError(404, "Profile not found");

    await prisma.$transaction([
      prisma.profileLanguage.deleteMany({ where: { profileId: profile.id } }),
      prisma.profileLanguage.createMany({
        data: languages.map((l) => ({ profileId: profile.id, language: l.language, proficiency: l.proficiency })),
      }),
    ]);
    const updated = await prisma.profileLanguage.findMany({ where: { profileId: profile.id } });
    return res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ── Presence: status + mood emoji + custom status ───────────────────────────────
const presenceSchema = z.object({
  status: z.nativeEnum(PresenceStatus).optional(),
  moodEmoji: z.string().max(8).optional(),
  customStatus: z.string().max(80).optional(),
});

usersRouter.patch("/me/presence", requireAuth, async (req, res, next) => {
  try {
    const body = presenceSchema.parse(req.body);
    const presence = await prisma.presence.update({
      where: { userId: req.userId },
      data: { ...body, lastActiveAt: new Date() },
    });
    return res.json(presence);
  } catch (e) {
    next(e);
  }
});

// ── Equip cosmetics (worn identity load-out) ────────────────────────────────────
const loadoutSchema = z.object({
  frameId: z.string().nullish(),
  entranceId: z.string().nullish(),
  bubbleId: z.string().nullish(),
  nameplateId: z.string().nullish(),
  profileThemeId: z.string().nullish(),
  titleId: z.string().nullish(),
});

usersRouter.put("/me/loadout", requireAuth, async (req, res, next) => {
  try {
    const body = loadoutSchema.parse(req.body);
    const loadout = await prisma.identityLoadout.update({ where: { userId: req.userId }, data: body });
    return res.json(loadout);
  } catch (e) {
    next(e);
  }
});

// ── Public profile (what others see in a room) ──────────────────────────────────
usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        profile: { include: { languages: true } },
        presence: true,
        levelStats: true,
        loadout: true,
        userBadges: { include: { badge: true } },
        vip: { include: { tier: true } },
      },
    });
    if (!user) throw new HttpError(404, "User not found");
    return res.json({
      id: user.id,
      verified: user.verified,
      profile: user.profile,
      presence: user.presence,
      badges: user.userBadges.map((b) => b.badge),
      vip: user.vip?.tier?.name ?? null,
      loadout: user.loadout,
      levels: user.levelStats && {
        charmLevel: user.levelStats.charmLevel,
        wealthLevel: user.levelStats.wealthLevel,
        activityLevel: user.levelStats.activityLevel,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── Follow / unfollow ───────────────────────────────────────────────────────────
usersRouter.post("/:id/follow", requireAuth, async (req, res, next) => {
  try {
    if (req.params.id === req.userId) throw new HttpError(400, "Cannot follow yourself");
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.userId!, followingId: req.params.id } },
      update: {},
      create: { followerId: req.userId!, followingId: req.params.id },
    });
    return res.status(204).end();
  } catch (e) {
    next(e);
  }
});
