import { create } from "zustand";
import { api, AuthResponse, Me, setAccessToken } from "../api/client";
import { connectSocket, disconnectSocket } from "../api/socket";

interface AuthState {
  token: string | null;
  me: Me | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, primaryLanguage?: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  me: null,
  loading: false,
  error: null,

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const res = await api.login({ email, password });
      await onAuth(res, set);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  async register(email, password, displayName, primaryLanguage) {
    set({ loading: true, error: null });
    try {
      const res = await api.register({ email, password, displayName, primaryLanguage });
      await onAuth(res, set);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  async refreshMe() {
    if (!get().token) return;
    const me = await api.me();
    set({ me });
  },

  logout() {
    setAccessToken(null);
    disconnectSocket();
    set({ token: null, me: null });
  },
}));

async function onAuth(res: AuthResponse, set: (partial: Partial<AuthState>) => void) {
  setAccessToken(res.accessToken);
  connectSocket(res.accessToken);
  const me = await api.me();
  set({ token: res.accessToken, me });
}
