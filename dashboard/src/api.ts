// Dashboard API client. Base URLs configurable via Vite env.
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8080';

export interface Driver {
  id: string; name: string; phone: string;
  status: 'Idle' | 'Delivering' | 'Offline';
  currentLat: number | null; currentLng: number | null; lastSeenAt: string | null;
}
export type BusinessType = 'Restaurant' | 'Takeaway' | 'Pharmacy' | 'Grocery' | 'Minimarket' | 'Kiosk' | 'Other';
export interface Business { name: string; businessType: BusinessType }

export interface Order {
  id: string; customerAddress: string; totalCashToCollect: number;
  status: string; driverId: string | null; deliveredAt: string | null; settled: boolean;
  publicToken: string;
  customerPhone: string | null; landmark: string | null; notes: string | null;
  requiresPrescription: boolean;
}

async function req(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/api/auth/manager/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('login failed')))),

  state: (token: string): Promise<{ business: Business; drivers: Driver[]; orders: Order[] }> =>
    req('/api/state', token),

  cashDrawer: (token: string) => req('/api/cash-drawer', token),

  settle: (token: string, driverId: string) =>
    req(`/api/drivers/${driverId}/settle`, token, { method: 'POST' }),

  createOrder: (token: string, o: { customerAddress: string; totalCashEGP: number;
    landmark?: string; customerPhone?: string; requiresPrescription?: boolean }) =>
    req('/api/orders', token, { method: 'POST', body: JSON.stringify(o) }),

  assign: (token: string, orderId: string, driverId: string) =>
    req(`/api/orders/${orderId}/assign`, token, { method: 'POST', body: JSON.stringify({ driverId }) }),

  route: (token: string, driverId: string): Promise<{ points: { lat: number; lng: number; timestamp: string }[] }> =>
    req(`/api/drivers/${driverId}/route`, token),
};

export const egp = (piastres: number) =>
  (piastres / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 }) + ' EGP';
