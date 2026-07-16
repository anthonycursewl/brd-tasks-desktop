import { AuthState, AuthUser, AuthTokens } from "../types/auth";

const STORAGE_KEY = "brd_auth";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.malet.app";

function sourceHeaders(): Record<string, string> {
  return { "X-Client-Source": "taskiti", "Content-Type": "application/json" };
}

function save(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { mode: "guest", user: null, tokens: null };
}

function clear() {
  localStorage.removeItem(STORAGE_KEY);
}

export const auth = {
  load,
  save,
  clear,

  async loginWithEmail(email: string, password: string): Promise<AuthState> {
    const res = await fetch(`${BASE_URL}/auth/taskiti/login`, {
      method: "POST",
      headers: sourceHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let msg: string;
      try { const b = await res.json(); msg = Array.isArray(b.message) ? b.message.join(', ') : b.message; } catch { msg = ''; }
      throw new Error(msg || (res.status === 401 ? "Correo o contraseña incorrectos" : "Error al iniciar sesión"));
    }

    const data: { user: AuthUser; tokens: AuthTokens } = await res.json();
    const state: AuthState = { mode: "account", user: data.user, tokens: data.tokens };
    save(state);
    localStorage.setItem("brd_needs_full_sync", "true");
    return state;
  },

  async register(name: string, email: string, password: string): Promise<AuthState> {
    const res = await fetch(`${BASE_URL}/auth/taskiti/register`, {
      method: "POST",
      headers: sourceHeaders(),
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      let msg: string;
      try { const b = await res.json(); msg = Array.isArray(b.message) ? b.message.join(', ') : b.message; } catch { msg = ''; }
      throw new Error(msg || (res.status === 409 ? "El correo ya está registrado" : "Error al registrarse"));
    }

    const data: { user: AuthUser; tokens: AuthTokens } = await res.json();
    const state: AuthState = { mode: "account", user: data.user, tokens: data.tokens };
    save(state);
    localStorage.setItem("brd_needs_full_sync", "true");
    return state;
  },

  async verify(tokens: AuthTokens): Promise<AuthUser | null> {
    const res = await fetch(`${BASE_URL}/auth/taskiti/verify`, {
      headers: {
        ...sourceHeaders(),
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar_url: data.user.avatar_url || "",
    };
  },

  async refreshToken(tokens: AuthTokens): Promise<AuthTokens> {
    const res = await fetch(`${BASE_URL}/auth/taskiti/refresh`, {
      method: "POST",
      headers: sourceHeaders(),
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!res.ok) {
      clear();
      throw new Error("Sesión expirada");
    }

    const data = await res.json();
    const newTokens = data.tokens as AuthTokens;
    const current = load();
    current.tokens = newTokens;
    save(current);
    return newTokens;
  },

  logout() {
    clear();
    localStorage.removeItem("brd_needs_full_sync");
    return { mode: "guest" as const, user: null, tokens: null };
  },
};
