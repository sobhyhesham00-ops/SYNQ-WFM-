import type { Page, Route } from '@playwright/test';

// Canned backend responses for a small, running business, so the dashboard
// renders a realistic authenticated state with no server behind it.
export const business = {
  name: 'Koshari El Tahrir',
  phone: '01000000000',
  businessType: 'Restaurant' as const,
  plan: 'Growth' as const,
  ramadanMode: false,
  iftarTime: null,
  shopLat: 30.0444,
  shopLng: 31.2357,
};

export const drivers = [
  {
    id: 'drv_1', name: 'Ahmed Sabry', phone: '01111111111', status: 'Delivering' as const,
    currentLat: 30.05, currentLng: 31.24, lastSeenAt: '2026-07-22T09:00:00Z',
    rating: 4.8, ratingCount: 20, active: true,
  },
  {
    id: 'drv_2', name: 'Mona Farid', phone: '01222222222', status: 'Idle' as const,
    currentLat: 30.04, currentLng: 31.23, lastSeenAt: '2026-07-22T09:00:00Z',
    rating: 4.9, ratingCount: 12, active: true,
  },
];

export const orders = [
  {
    id: 'ord_pending', customerAddress: '12 Falaki St, Bab El Louk', totalCashToCollect: 15000,
    status: 'Pending', driverId: null, deliveredAt: null, settled: false, publicToken: 'tok_a',
    customerPhone: '01099999999', landmark: 'Over the pharmacy', notes: null,
    requiresPrescription: false, createdAt: '2026-07-22T08:30:00Z',
  },
  {
    id: 'ord_delivered', customerAddress: '5 Champollion St', totalCashToCollect: 8000,
    status: 'Delivered', driverId: 'drv_1', deliveredAt: '2026-07-22T08:50:00Z', settled: false,
    publicToken: 'tok_b', customerPhone: null, landmark: null, notes: null,
    requiresPrescription: false, createdAt: '2026-07-22T08:20:00Z',
  },
];

const emptyAttention = {
  failed: [], stalePending: [], staleAssigned: [], count: 0,
  thresholds: { stalePendingMin: 15, staleAssignedMin: 30 },
};

const analytics = {
  ordersToday: 2, deliveredToday: 1, avgDeliveryMinutes: 22,
  collectedEGP: '80.00', outstandingEGP: '80.00',
};

const daily = {
  days: 14,
  series: Array.from({ length: 14 }, (_, i) => ({
    date: `2026-07-${String(9 + i).padStart(2, '0')}`,
    deliveries: (i % 5) + 1,
    collectedPiastres: ((i % 5) + 1) * 8000,
    collectedEGP: (((i % 5) + 1) * 80).toFixed(2),
  })),
};

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

// Register API stubs. The catch-all goes first so the specific routes below it
// (registered later) take priority — Playwright matches last-registered first.
export async function stubApi(page: Page, over: Partial<{
  drivers: unknown; orders: unknown; business: unknown;
}> = {}) {
  await page.route('**/api/**', (route) => json(route, {}));
  await page.route('**/api/state', (route) => json(route, {
    business: over.business ?? business,
    drivers: over.drivers ?? drivers,
    orders: over.orders ?? orders,
  }));
  await page.route('**/api/orders/attention**', (route) => json(route, emptyAttention));
  await page.route(/\/api\/analytics$/, (route) => json(route, analytics));
  await page.route('**/api/analytics/daily**', (route) => json(route, daily));
}

// Boot the app already authenticated in English, skipping the login screen.
export async function seedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('meshwar_token', 'test-token');
    localStorage.setItem('meshwar_name', 'Manager');
    localStorage.setItem('meshwar_lang', 'en');
  });
}
