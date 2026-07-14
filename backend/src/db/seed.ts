/**
 * Seed two demo merchants so you can see the multi-vertical dashboard:
 *   Restaurant — manager@demo.eg  / password123   (drivers 01000000001/2 · 1234)
 *   Pharmacy   — pharmacy@demo.eg / password123    (driver  01000000003   · 1234)
 * Run: npx tsx src/db/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (s: string) => bcrypt.hashSync(s, 10);

  const restaurant = await prisma.restaurant.create({
    data: { name: 'Koshary El Tahrir', phone: '0223900000', businessType: 'Restaurant',
      plan: 'Growth', shopLat: 30.0450, shopLng: 31.2360 },
  });

  await prisma.managerUser.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Cashier Amr',
      email: 'manager@demo.eg',
      passwordHash: hash('password123'),
      role: 'manager',
    },
  });

  const [d1, d2] = await Promise.all([
    prisma.driver.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Mahmoud',
        phone: '01000000001',
        passwordHash: hash('1234'),
        // Downtown Cairo, so the demo map has something to show.
        currentLat: 30.0444,
        currentLng: 31.2357,
        status: 'Idle',
      },
    }),
    prisma.driver.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Sayed',
        phone: '01000000002',
        passwordHash: hash('1234'),
        currentLat: 30.0561,
        currentLng: 31.2394,
        status: 'Delivering',
      },
    }),
  ]);

  await prisma.order.createMany({
    data: [
      { restaurantId: restaurant.id, driverId: d2.id, customerAddress: '12 Sherif St, Downtown',
        landmark: 'Over the pharmacy, next to the mosque', customerPhone: '01011112222',
        totalCashToCollect: 12500, status: 'Delivered',
        assignedAt: new Date(Date.now() - 28 * 60000), deliveredAt: new Date() },
      { restaurantId: restaurant.id, driverId: d2.id, customerAddress: '8 Talaat Harb Sq',
        totalCashToCollect: 8000, status: 'Delivered', rating: 5,
        assignedAt: new Date(Date.now() - 19 * 60000), deliveredAt: new Date() },
      { restaurantId: restaurant.id, driverId: d1.id, customerAddress: '30 Kasr El Nil St',
        landmark: 'Yellow building, 3rd floor', customerPhone: '01033334444',
        totalCashToCollect: 20000, status: 'PickedUp', deliveryOtp: '4827' },
      { restaurantId: restaurant.id, customerAddress: '5 Mohamed Mahmoud St',
        totalCashToCollect: 15000, status: 'Pending' },
    ],
  });

  // ---- A pharmacy tenant, to show the multi-vertical model. ----
  const pharmacy = await prisma.restaurant.create({
    data: { name: 'Seif Pharmacy', phone: '0227000000', businessType: 'Pharmacy', plan: 'Starter' },
  });
  await prisma.managerUser.create({
    data: {
      restaurantId: pharmacy.id,
      name: 'Dr. Hoda',
      email: 'pharmacy@demo.eg',
      passwordHash: hash('password123'),
      role: 'manager',
    },
  });
  const d3 = await prisma.driver.create({
    data: {
      restaurantId: pharmacy.id, name: 'Ramy', phone: '01000000003',
      passwordHash: hash('1234'), currentLat: 30.05, currentLng: 31.24, status: 'Delivering',
    },
  });
  await prisma.order.createMany({
    data: [
      { restaurantId: pharmacy.id, driverId: d3.id, customerAddress: '14 El Falaki St',
        landmark: 'Above Bank Misr', customerPhone: '01055556666',
        requiresPrescription: true, notes: 'Chronic meds — monthly refill',
        totalCashToCollect: 34000, status: 'PickedUp', deliveryOtp: '3391' },
      { restaurantId: pharmacy.id, customerAddress: '2 Champollion St',
        requiresPrescription: false, totalCashToCollect: 9000, status: 'Pending' },
    ],
  });

  // A GPS trail for Sayed (d2) so route-replay has something to draw:
  // a ~30-point path winding through Downtown Cairo over the last hour.
  const start = { lat: 30.0444, lng: 31.2357 };
  const trail: { driverId: string; lat: number; lng: number; timestamp: Date }[] = [];
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    trail.push({
      driverId: d2.id,
      // gentle curve NE with a little jitter to look like real streets
      lat: start.lat + t * 0.018 + Math.sin(t * 6) * 0.0016,
      lng: start.lng + t * 0.012 + Math.cos(t * 5) * 0.0016,
      timestamp: new Date(now - (30 - i) * 60_000),
    });
  }
  await prisma.locationLog.createMany({ data: trail });

  // ---- A koshk (كشك) tenant — the classic Egyptian street kiosk. ----
  const koshk = await prisma.restaurant.create({
    data: { name: 'Koshk El Sae3a', phone: '0225000000', businessType: 'Kiosk',
      shopLat: 30.0478, shopLng: 31.2336 },
  });
  await prisma.managerUser.create({
    data: {
      restaurantId: koshk.id, name: 'Am Sabry', email: 'koshk@demo.eg',
      passwordHash: hash('password123'), role: 'manager',
    },
  });
  const d4 = await prisma.driver.create({
    data: {
      restaurantId: koshk.id, name: 'Hassan', phone: '01000000004',
      passwordHash: hash('1234'), currentLat: 30.048, currentLng: 31.238, status: 'Idle',
    },
  });
  await prisma.order.createMany({
    data: [
      { restaurantId: koshk.id, driverId: d4.id, customerAddress: '3 Abdel Khalek Tharwat St',
        landmark: 'Next to the ahwa (café)', customerPhone: '01077778888',
        totalCashToCollect: 4500, status: 'Delivered', deliveredAt: new Date() },
      { restaurantId: koshk.id, customerAddress: '9 Emad El Din St',
        totalCashToCollect: 2500, status: 'Pending' },
    ],
  });

  console.log('Seeded. Logins: manager@demo.eg · pharmacy@demo.eg · koshk@demo.eg (password123)');
}

main().finally(() => prisma.$disconnect());
