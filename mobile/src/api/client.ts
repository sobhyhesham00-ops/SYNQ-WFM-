import Constants from "expo-constants";

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:4000";

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getApiUrl = () => API_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

// Typed API surface used by the screens.
export const api = {
  register: (b: { email: string; password: string; displayName: string; primaryLanguage?: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(b) }),
  me: () => request<Me>("/auth/me"),

  listRooms: (params?: { language?: string; category?: string; q?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<RoomSummary[]>(`/rooms${qs ? `?${qs}` : ""}`);
  },
  createRoom: (b: Record<string, unknown>) => request<any>("/rooms", { method: "POST", body: JSON.stringify(b) }),
  joinRoom: (id: string) => request<any>(`/rooms/${id}/join`, { method: "POST" }),

  giftCatalog: () => request<Gift[]>("/gifts/catalog"),
  sendGift: (b: { receiverId: string; giftId: string; quantity?: number; roomId?: string }) =>
    request<any>("/gifts/send", { method: "POST", body: JSON.stringify(b) }),

  wallet: () => request<{ coins: string; diamonds: string }>("/wallet"),
  topUp: (b: { productId: string; coins: number }) =>
    request<{ coins: string; diamonds: string }>("/wallet/topup", { method: "POST", body: JSON.stringify(b) }),

  levels: () => request<Levels>("/identity/levels"),
  store: () => request<Cosmetic[]>("/identity/store"),
  leaderboard: (board: "wealth" | "charm") => request<LeaderRow[]>(`/identity/leaderboard?board=${board}`),

  setPresence: (b: { status?: string; moodEmoji?: string; customStatus?: string }) =>
    request<any>("/users/me/presence", { method: "PATCH", body: JSON.stringify(b) }),
};

// ── Types ────────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: string; displayName?: string };
}
export interface Me {
  id: string;
  profile: { displayName: string; primaryLanguage?: string; countryCode?: string } | null;
  presence: { status: string; moodEmoji?: string; customStatus?: string } | null;
  wallet: { coins: string; diamonds: string } | null;
  levelStats: { charmLevel: number; wealthLevel: number; activityLevel: number; streakDays: number } | null;
}
export interface RoomSummary {
  id: string;
  title: string;
  category?: string;
  type: string;
  primaryLanguage?: string;
  allowedLanguages: string[];
  listeners: number;
  host?: string;
}
export interface Gift {
  id: string;
  name: string;
  emoji?: string;
  priceCoins: number;
  rarity: string;
  broadcast: boolean;
}
export interface Cosmetic {
  id: string;
  type: string;
  name: string;
  priceCoins: number;
  rarity: string;
}
export interface Levels {
  charm: Progress;
  wealth: Progress;
  activity: Progress;
  streakDays: number;
}
export interface Progress {
  level: number;
  current: number;
  needed: number;
  pct: number;
}
export interface LeaderRow {
  rank: number;
  userId: string;
  displayName?: string;
  level: number;
  xp: string;
}
