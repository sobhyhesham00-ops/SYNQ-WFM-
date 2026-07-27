import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/error";

type Tx = Prisma.TransactionClient;

/**
 * Credit or debit a wallet AND write a ledger row, atomically.
 * Pass a transaction client (tx) when composing with other writes (e.g. gift send).
 */
export async function applyWalletChange(
  db: Tx,
  params: {
    userId: string;
    coinsDelta?: bigint;
    diamondDelta?: bigint;
    type: TransactionType;
    reference?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const { userId, coinsDelta = 0n, diamondDelta = 0n, type, reference, metadata } = params;

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new HttpError(404, "Wallet not found");

  const newCoins = wallet.coins + coinsDelta;
  const newDiamonds = wallet.diamonds + diamondDelta;
  if (newCoins < 0n) throw new HttpError(400, "Insufficient coins");
  if (newDiamonds < 0n) throw new HttpError(400, "Insufficient diamonds");

  await db.wallet.update({
    where: { userId },
    data: { coins: newCoins, diamonds: newDiamonds },
  });

  await db.transaction.create({
    data: { userId, coinsDelta, diamondDelta, type, reference, metadata },
  });

  return { coins: newCoins, diamonds: newDiamonds };
}

/**
 * Top up coins after a verified store/Stripe purchase.
 * TODO(provider: iap/stripe): verify the receipt/charge BEFORE calling this.
 */
export async function topUpCoins(userId: string, coins: number, reference: string) {
  return prisma.$transaction((tx) =>
    applyWalletChange(tx, {
      userId,
      coinsDelta: BigInt(coins),
      type: TransactionType.TOPUP,
      reference,
    })
  );
}

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new HttpError(404, "Wallet not found");
  return { coins: wallet.coins.toString(), diamonds: wallet.diamonds.toString() };
}
