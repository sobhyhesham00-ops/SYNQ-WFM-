import { Router } from "express";
import { z } from "zod";
import { TransactionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { applyWalletChange } from "../wallet/wallet.service";
import { progressToNext } from "../../lib/levels";

export const identityRouter = Router();

// ── Cosmetic storefront (frames, entrances/mounts, bubbles, titles…) ────────────
identityRouter.get("/store", async (_req, res, next) => {
  try {
    const items = await prisma.cosmeticItem.findMany({ where: { active: true }, orderBy: { priceCoins: "asc" } });
    return res.json(items);
  } catch (e) {
    next(e);
  }
});

// Buy a cosmetic with coins → adds to inventory (pure-margin revenue).
identityRouter.post("/store/:cosmeticId/buy", requireAuth, async (req, res, next) => {
  try {
    const cosmetic = await prisma.cosmeticItem.findUnique({ where: { id: req.params.cosmeticId } });
    if (!cosmetic || !cosmetic.active) throw new HttpError(404, "Item not found");
    if (cosmetic.priceCoins <= 0) throw new HttpError(400, "Item is not purchasable");

    const expiresAt = cosmetic.durationDays
      ? new Date(Date.now() + cosmetic.durationDays * 86_400_000)
      : null;

    const inventoryItem = await prisma.$transaction(async (tx) => {
      await applyWalletChange(tx, {
        userId: req.userId!,
        coinsDelta: BigInt(-cosmetic.priceCoins),
        type: TransactionType.COSMETIC_PURCHASE,
        reference: cosmetic.id,
      });
      return tx.inventoryItem.upsert({
        where: { userId_cosmeticId: { userId: req.userId!, cosmeticId: cosmetic.id } },
        update: { expiresAt },
        create: { userId: req.userId!, cosmeticId: cosmetic.id, expiresAt },
      });
    });

    return res.status(201).json(inventoryItem);
  } catch (e) {
    next(e);
  }
});

// The user's owned cosmetics.
identityRouter.get("/inventory", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: req.userId },
      include: { cosmetic: true },
    });
    return res.json(items);
  } catch (e) {
    next(e);
  }
});

// Triple-progression levels with progress-to-next.
identityRouter.get("/levels", requireAuth, async (req, res, next) => {
  try {
    const stats = await prisma.levelStats.findUnique({ where: { userId: req.userId } });
    if (!stats) throw new HttpError(404, "Level stats not found");
    return res.json({
      charm: progressToNext(stats.charmXp),
      wealth: progressToNext(stats.wealthXp),
      activity: progressToNext(stats.activityXp),
      streakDays: stats.streakDays,
    });
  } catch (e) {
    next(e);
  }
});

// ── Leaderboards — the recurring reason to spend ────────────────────────────────
// ?board=wealth|charm  (top spenders / most-gifted)
identityRouter.get("/leaderboard", async (req, res, next) => {
  try {
    const board = req.query.board === "charm" ? "charmXp" : "wealthXp";
    const top = await prisma.levelStats.findMany({
      orderBy: { [board]: "desc" },
      take: 20,
      include: { user: { include: { profile: true } } },
    });
    return res.json(
      top.map((s, i) => ({
        rank: i + 1,
        userId: s.userId,
        displayName: s.user.profile?.displayName,
        level: board === "charmXp" ? s.charmLevel : s.wealthLevel,
        xp: (board === "charmXp" ? s.charmXp : s.wealthXp).toString(),
      }))
    );
  } catch (e) {
    next(e);
  }
});

// ── CP / couple bond — publicly link two users 💞 ───────────────────────────────
identityRouter.post("/bonds", requireAuth, async (req, res, next) => {
  try {
    const { partnerId, title } = z
      .object({ partnerId: z.string(), title: z.string().max(40).optional() })
      .parse(req.body);
    if (partnerId === req.userId) throw new HttpError(400, "Pick someone else 💞");
    const bond = await prisma.bond.create({
      data: { userAId: req.userId!, userBId: partnerId, title },
    });
    return res.status(201).json(bond);
  } catch (e) {
    next(e);
  }
});
