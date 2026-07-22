// Dashboard API client. Base URLs configurable via Vite env.
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';
export const WS_BASE = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8080';

export interface Driver {
  id: string; name: string; phone: string;
  status: 'Idle' | 'Delivering' | 'Offline';
  currentLat: number | null; currentLng: number | null; lastSeenAt: string | null;
  rating?: number | null; ratingCount?: number; active?: boolean;
}
export type BusinessType = 'Restaurant' | 'Takeaway' | 'Pharmacy' | 'Grocery' | 'Minimarket' | 'Kiosk' | 'Other';
export const BUSINESS_TYPES: BusinessType[] =
  ['Restaurant', 'Takeaway', 'Pharmacy', 'Grocery', 'Minimarket', 'Kiosk', 'Other'];
export type PlanTier = 'Free' | 'Starter' | 'Growth' | 'Chain';
export interface Business {
  name: string; businessType: BusinessType; plan?: PlanTier;
  ramadanMode?: boolean; iftarTime?: string | null;
  shopLat?: number | null; shopLng?: number | null;
}
export interface Analytics {
  ordersToday: number; deliveredToday: number;
  avgDeliveryMinutes: number | null; collectedEGP: string; outstandingEGP: string;
}

export interface Order {
  id: string; customerAddress: string; totalCashToCollect: number;
  status: string; driverId: string | null; deliveredAt: string | null; settled: boolean;
  publicToken: string;
  customerPhone: string | null; landmark: string | null; notes: string | null;
  requiresPrescription: boolean; createdAt?: string;
}

// Prefer the freshest token in storage (updated by a silent refresh) over the
// one the caller closed over, which may have gone stale mid-session.
function currentToken(fallback?: string) {
  return localStorage.getItem('meshwar_token') ?? fallback ?? '';
}

// Exchange the stored refresh token for a new access token. Returns true on success.
async function tryRefresh(): Promise<boolean> {
  const rt = localStorage.getItem('meshwar_refresh');
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.token) { localStorage.setItem('meshwar_token', data.token); return true; }
  } catch { /* offline — fall through */ }
  return false;
}

async function req(path: string, token: string, init?: RequestInit) {
  const doFetch = (t: string) => fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  let res = await doFetch(currentToken(token));
  // Access token expired? Refresh once and retry transparently.
  if (res.status === 401 && (await tryRefresh())) {
    res = await doFetch(currentToken(token));
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Persist a refresh token returned by login/register, passing the payload through.
function storeRefresh<T extends { refreshToken?: string }>(data: T): T {
  if (data?.refreshToken) localStorage.setItem('meshwar_refresh', data.refreshToken);
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    fetch(`${API_BASE}/api/auth/manager/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('login failed')))).then(storeRefresh),

  register: (body: {
    businessName: string; businessType: BusinessType; phone?: string;
    managerName: string; email: string; password: string;
  }) =>
    fetch(`${API_BASE}/api/auth/manager/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error || 'signup failed')))).then(storeRefresh),

  updateBusiness: (token: string, patch: { ramadanMode?: boolean; iftarTime?: string | null; plan?: PlanTier }) =>
    req('/api/business', token, { method: 'PATCH', body: JSON.stringify(patch) }),

  checkout: (token: string, plan: PlanTier, method: 'fawry' | 'vodafone' | 'instapay', cycle: 'monthly' | 'annual'): Promise<{
    plan: PlanTier; method?: string; cycle?: string; reference?: string; amountEGP?: string; payTo?: string | null;
    free?: boolean; contactSales?: boolean;
  }> =>
    req('/api/billing/checkout', token, { method: 'POST', body: JSON.stringify({ plan, method, cycle }) }),
  confirmPayment: (token: string, body: { plan: PlanTier; method: string; cycle: string; reference: string }) =>
    req('/api/billing/confirm', token, { method: 'POST', body: JSON.stringify(body) }),

  billingHistory: (token: string): Promise<{ id: string; plan: string; method: string; cycle: string; amountEGP: string; reference: string; date: string }[]> =>
    req('/api/billing/history', token),

  addDriver: (token: string, d: { name: string; phone: string; password: string }): Promise<Driver> =>
    req('/api/drivers', token, { method: 'POST', body: JSON.stringify(d) }),

  setDriverActive: (token: string, driverId: string, active: boolean) =>
    req(`/api/drivers/${driverId}`, token, { method: 'PATCH', body: JSON.stringify({ active }) }),

  resetDriverPin: (token: string, driverId: string, password: string) =>
    req(`/api/drivers/${driverId}/reset-pin`, token, { method: 'POST', body: JSON.stringify({ password }) }),

  analytics: (token: string): Promise<Analytics> => req('/api/analytics', token),

  dailyAnalytics: (token: string, days = 14): Promise<{
    days: number;
    series: { date: string; deliveries: number; collectedPiastres: number; collectedEGP: string }[];
  }> => req(`/api/analytics/daily?days=${days}`, token),

  dailySummary: (token: string): Promise<{
    businessName: string; date: string; deliveries: number; openOrders: number;
    collectedEGP: string; outstandingEGP: string; activeDrivers: number; totalDrivers: number;
  }> => req('/api/summary/today', token),

  leaderboard: (token: string): Promise<{ days: number; board: {
    driverId: string; name: string; deliveries: number; collectedEGP: string;
    avgMinutes: number | null; rating: number | null;
  }[] }> => req('/api/leaderboard', token),

  // Download the weekly cash report CSV (triggers a browser download).
  async exportCashCsv(token: string, days = 7) {
    const res = await fetch(`${API_BASE}/api/reports/cash.csv?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `meshwar-cash-${days}d.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },

  // Download the per-driver performance report CSV.
  async exportDriversCsv(token: string, days = 30) {
    const res = await fetch(`${API_BASE}/api/reports/drivers.csv?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `elkaptin-drivers-${days}d.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },

  state: (token: string): Promise<{ business: Business; drivers: Driver[]; orders: Order[] }> =>
    req('/api/state', token),

  orderHistory: (token: string, params: {
    q?: string; status?: string; driverId?: string; from?: string; to?: string; limit?: number; offset?: number;
  }): Promise<{ orders: Order[]; total: number; limit: number; offset: number }> => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return req(`/api/orders/history?${q.toString()}`, token);
  },

  cashDrawer: (token: string) => req('/api/cash-drawer', token),

  attention: (token: string): Promise<{
    failed: Order[]; stalePending: Order[]; staleAssigned: Order[];
    count: number; thresholds: { stalePendingMin: number; staleAssignedMin: number };
  }> => req('/api/orders/attention', token),

  settle: (token: string, driverId: string) =>
    req(`/api/drivers/${driverId}/settle`, token, { method: 'POST' }),

  createOrder: (token: string, o: { customerAddress: string; totalCashEGP: number;
    landmark?: string; customerPhone?: string; requiresPrescription?: boolean }) =>
    req('/api/orders', token, { method: 'POST', body: JSON.stringify(o) }),

  assign: (token: string, orderId: string, driverId: string) =>
    req(`/api/orders/${orderId}/assign`, token, { method: 'POST', body: JSON.stringify({ driverId }) }),

  cancelOrder: (token: string, orderId: string, reason?: string) =>
    req(`/api/orders/${orderId}/cancel`, token, { method: 'POST', body: JSON.stringify({ reason }) }),

  editOrder: (token: string, orderId: string, patch: {
    customerAddress?: string; landmark?: string; customerPhone?: string;
    totalCashEGP?: number; requiresPrescription?: boolean;
  }) => req(`/api/orders/${orderId}`, token, { method: 'PATCH', body: JSON.stringify(patch) }),

  route: (token: string, driverId: string): Promise<{ points: { lat: number; lng: number; timestamp: string }[] }> =>
    req(`/api/drivers/${driverId}/route`, token),
};

export const egp = (piastres: number) =>
  (piastres / 100).toLocaleString('en-EG', { minimumFractionDigits: 2 }) + ' EGP';
