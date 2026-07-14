/**
 * Cash Drawer / COD reconciliation service.  (Blueprint §4)
 *
 * Answers the manager's core question at end of shift:
 *   "How much cash must THIS driver hand over to the cashier right now?"
 *
 * Rules:
 *  - Only DELIVERED orders count (Pending/Assigned/PickedUp = no cash yet).
 *  - Only UNSETTLED orders count (settled = cash already handed over).
 *  - All money is in integer piastres to avoid float rounding on cash.
 *
 * The "settle" action is wrapped in a DB transaction with a row lock so a
 * double-tap by the cashier can't zero the drawer twice or race a new delivery.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CashDrawerLine {
  orderId: string;
  customerAddress: string;
  amountPiastres: number;
  deliveredAt: Date | null;
}

export interface CashDrawerSummary {
  driverId: string;
  driverName: string;
  orderCount: number;
  totalPiastres: number; // what the driver owes the cashier
  totalEGP: string;      // human-friendly, e.g. "1,250.00"
  lines: CashDrawerLine[];
}

const fmtEGP = (piastres: number): string =>
  (piastres / 100).toLocaleString('en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Read-only: what does this driver currently owe?
 * Called by the dashboard live and refreshed on every 'order delivered' event.
 */
export async function getDriverCashDrawer(
  driverId: string,
): Promise<CashDrawerSummary> {
  const driver = await prisma.driver.findUniqueOrThrow({
    where: { id: driverId },
    select: { id: true, name: true },
  });

  const orders = await prisma.order.findMany({
    where: { driverId, status: 'Delivered', settled: false },
    select: {
      id: true,
      customerAddress: true,
      totalCashToCollect: true,
      deliveredAt: true,
    },
    orderBy: { deliveredAt: 'asc' },
  });

  const totalPiastres = orders.reduce((s, o) => s + o.totalCashToCollect, 0);

  return {
    driverId: driver.id,
    driverName: driver.name,
    orderCount: orders.length,
    totalPiastres,
    totalEGP: fmtEGP(totalPiastres),
    lines: orders.map((o) => ({
      orderId: o.id,
      customerAddress: o.customerAddress,
      amountPiastres: o.totalCashToCollect,
      deliveredAt: o.deliveredAt,
    })),
  };
}

/**
 * Whole-restaurant view: one drawer row per driver who owes money.
 * This is the manager's end-of-day screen.
 */
export async function getRestaurantCashDrawers(
  restaurantId: string,
): Promise<{ drivers: CashDrawerSummary[]; grandTotalEGP: string }> {
  const drivers = await prisma.driver.findMany({
    where: { restaurantId },
    select: { id: true },
  });

  const summaries = await Promise.all(
    drivers.map((d) => getDriverCashDrawer(d.id)),
  );

  const owing = summaries.filter((s) => s.orderCount > 0);
  const grandTotal = owing.reduce((s, d) => s + d.totalPiastres, 0);

  return { drivers: owing, grandTotalEGP: fmtEGP(grandTotal) };
}

/**
 * The cashier taps "Received cash from driver".
 * Marks the given delivered+unsettled orders as settled, atomically.
 *
 * We SELECT ... FOR UPDATE the rows inside a transaction so two cashier taps
 * (or a tap racing a fresh delivery) can never settle the same order twice.
 * Returns the exact amount that was just cleared.
 */
export async function settleDriverCash(
  driverId: string,
): Promise<{ settledPiastres: number; settledEGP: string; orderCount: number }> {
  return prisma.$transaction(
    async (tx) => {
      // Lock the driver's open delivered orders for the duration of the txn.
      const rows = await tx.$queryRaw<{ id: string; total_cash_to_collect: number }[]>(
        Prisma.sql`
          SELECT id, total_cash_to_collect
          FROM orders
          WHERE driver_id = ${driverId}::uuid
            AND status = 'Delivered'
            AND settled = false
          FOR UPDATE
        `,
      );

      if (rows.length === 0) {
        return { settledPiastres: 0, settledEGP: '0.00', orderCount: 0 };
      }

      const settledPiastres = rows.reduce(
        (s, r) => s + r.total_cash_to_collect,
        0,
      );
      const ids = rows.map((r) => r.id);

      await tx.order.updateMany({
        where: { id: { in: ids } },
        data: { settled: true, settledAt: new Date() },
      });

      return {
        settledPiastres,
        settledEGP: fmtEGP(settledPiastres),
        orderCount: rows.length,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
