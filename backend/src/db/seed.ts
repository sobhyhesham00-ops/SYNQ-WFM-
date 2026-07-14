/**
 * Seed a demo restaurant so you can log in and see the dashboard immediately.
 *   Manager:  manager@demo.eg / password123
 *   Drivers:  01000000001 / 1234  ·  01000000002 / 1234
 * Run: npx tsx src/db/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (s: string) => bcrypt.hashSync(s, 10);

  const restaurant = await prisma.restaurant.create({
    data: { name: 'Koshary El Tahrir', phone: '0223900000' },
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
        totalCashToCollect: 12500, status: 'Delivered', deliveredAt: new Date() },
      { restaurantId: restaurant.id, driverId: d2.id, customerAddress: '8 Talaat Harb Sq',
        totalCashToCollect: 8000, status: 'Delivered', deliveredAt: new Date() },
      { restaurantId: restaurant.id, driverId: d1.id, customerAddress: '30 Kasr El Nil St',
        totalCashToCollect: 20000, status: 'PickedUp' },
      { restaurantId: restaurant.id, customerAddress: '5 Mohamed Mahmoud St',
        totalCashToCollect: 15000, status: 'Pending' },
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

  console.log('Seeded. Login: manager@demo.eg / password123');
}

main().finally(() => prisma.$disconnect());
