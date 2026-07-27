import { TransactionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/error";
import { applyWalletChange } from "../wallet/wallet.service";
import { levelForXp } from "../../lib/levels";

export interface SendGiftResult {
  giftEventId: string;
  senderCoins: string;
  receiverDiamonds: string;
  broadcast: boolean;
  gift: { name: string; emoji: string | null; animationUrl: string | null };
}

/**
 * Send a gift atomically:
 *  1. debit sender coins, credit receiver diamonds (with ledger rows)
 *  2. record the GiftEvent
 *  3. bump sender Wealth XP and receiver Charm XP (recompute levels)
 *
 * This is the core of the economy and the status ladders — see docs/REVENUE.md.
 */
export async function sendGift(params: {
  senderId: string;
  receiverId: string;
  giftId: string;
  quantity?: number;
  roomId?: string;
}): Promise<SendGiftResult> {
  const { senderId, receiverId, giftId, roomId } = params;
  const quantity = Math.max(1, params.quantity ?? 1);

  if (senderId === receiverId) throw new HttpError(400, "You cannot gift yourself");

  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift || !gift.active) throw new HttpError(404, "Gift not found");

  const coinsSpent = gift.priceCoins * quantity;
  const diamondsEarned = gift.diamondValue * quantity;

  return prisma.$transaction(async (tx) => {
    // 1. Money movement (+ ledger)
    const senderWallet = await applyWalletChange(tx, {
      userId: senderId,
      coinsDelta: BigInt(-coinsSpent),
      type: TransactionType.GIFT_SENT,
      reference: giftId,
    });
    const receiverWallet = await applyWalletChange(tx, {
      userId: receiverId,
      diamondDelta: BigInt(diamondsEarned),
      type: TransactionType.GIFT_RECEIVED,
      reference: giftId,
    });

    // 2. Record the event
    const event = await tx.giftEvent.create({
      data: { giftId, senderId, receiverId, roomId, quantity, coinsSpent },
    });

    // 3. Progression: sender gains Wealth XP (= coins spent), receiver gains Charm XP.
    const sender = await tx.levelStats.update({
      where: { userId: senderId },
      data: { wealthXp: { increment: BigInt(coinsSpent) } },
    });
    await tx.levelStats.update({
      where: { userId: senderId },
      data: { wealthLevel: levelForXp(sender.wealthXp) },
    });
    const receiver = await tx.levelStats.update({
      where: { userId: receiverId },
      data: { charmXp: { increment: BigInt(diamondsEarned) } },
    });
    await tx.levelStats.update({
      where: { userId: receiverId },
      data: { charmLevel: levelForXp(receiver.charmXp) },
    });

    return {
      giftEventId: event.id,
      senderCoins: senderWallet.coins.toString(),
      receiverDiamonds: receiverWallet.diamonds.toString(),
      broadcast: gift.broadcast,
      gift: { name: gift.name, emoji: gift.emoji, animationUrl: gift.animationUrl },
    };
  });
}
