import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { getWallet, topUpCoins } from "./wallet.service";

export const walletRouter = Router();

walletRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    return res.json(await getWallet(req.userId!));
  } catch (e) {
    next(e);
  }
});

// Ledger history.
walletRouter.get("/transactions", requireAuth, async (req, res, next) => {
  try {
    const txns = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json(
      txns.map((t) => ({
        id: t.id,
        type: t.type,
        coinsDelta: t.coinsDelta.toString(),
        diamondDelta: t.diamondDelta.toString(),
        createdAt: t.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

// Coin top-up. In production this is called AFTER server-side receipt verification.
// TODO(provider: iap/stripe): verify `receipt`/`productId` before crediting.
const topUpSchema = z.object({
  productId: z.string(),
  coins: z.number().int().min(1),
  receipt: z.string().optional(),
});

walletRouter.post("/topup", requireAuth, async (req, res, next) => {
  try {
    const body = topUpSchema.parse(req.body);
    // verifyReceipt(body.receipt, body.productId)  // <-- TODO(provider)
    const wallet = await topUpCoins(req.userId!, body.coins, body.productId);
    return res.json({ coins: wallet.coins.toString(), diamonds: wallet.diamonds.toString() });
  } catch (e) {
    next(e);
  }
});
