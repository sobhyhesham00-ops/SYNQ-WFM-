import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { sendGift } from "./gift.service";

export const giftsRouter = Router();

// Public gift catalog (what the store shows).
giftsRouter.get("/catalog", async (_req, res, next) => {
  try {
    const gifts = await prisma.gift.findMany({ where: { active: true }, orderBy: { priceCoins: "asc" } });
    return res.json(gifts);
  } catch (e) {
    next(e);
  }
});

// Send a gift over REST (rooms also send via the socket gateway for live animation).
const sendSchema = z.object({
  receiverId: z.string(),
  giftId: z.string(),
  quantity: z.number().int().min(1).max(999).default(1),
  roomId: z.string().optional(),
});

giftsRouter.post("/send", requireAuth, async (req, res, next) => {
  try {
    const body = sendSchema.parse(req.body);
    const result = await sendGift({ senderId: req.userId!, ...body });
    return res.json(result);
  } catch (e) {
    next(e);
  }
});
