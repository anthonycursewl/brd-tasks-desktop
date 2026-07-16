import { AuthTokens } from "../types/auth";
import {
  TaskListResponse, TaskResponse, DeleteResponse,
  CreateTaskPayload, UpdateTaskPayload, SyncPayload, SyncResponse,
} from "../types/api";
import { AnalyticsResponse } from "../types/analytics";
import { auth } from "./auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.malet.app";

let currentTokens: AuthTokens | null = null;

export function setTokens(tokens: AuthTokens | null) {
  currentTokens = tokens;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Source": "taskiti",
  };
  if (currentTokens) {
    h["Authorization"] = `Bearer ${currentTokens.access_token}`;
  }
  return h;
}

async function request<T>(url: string, options: RequestInit = {}, retries = 3): Promise<T> {
  let res = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers as Record<string, string>) } });

  if (res.status === 401 && currentTokens) {
    const newTokens = await auth.refreshToken(currentTokens).catch(() => null);
    if (newTokens) {
      setTokens(newTokens);
      res = await fetch(url, { ...options, headers: { ...headers(), ...(options.headers as Record<string, string>) } });
    }
  }

  if (res.status === 429 && retries > 0) {
    const wait = Math.min(1000 * Math.pow(2, 3 - retries), 8000);
    await new Promise((r) => setTimeout(r, wait));
    return request<T>(url, options, retries - 1);
  }

  if (!res.ok) {
    if (res.status === 429) throw new Error("Demasiadas solicitudes. Intenta de nuevo en unos segundos.");
    let errMsg = `HTTP ${res.status}`;
    let responseBody: any;
    try {
      responseBody = await res.json();
      if (Array.isArray(responseBody?.message)) {
        errMsg = responseBody.message.join(', ');
      } else if (typeof responseBody?.message === 'string') {
        errMsg = responseBody.message;
      } else if (typeof responseBody?.error === 'string') {
        errMsg = responseBody.error;
      }
    } catch {}

    if (res.status === 409) {
      const conflictErr = new Error(errMsg) as any;
      conflictErr.status = 409;
      conflictErr.serverTask = responseBody?.task ?? null;
      console.warn(`[API] 409 Conflict ${res.url}: ${errMsg}`, responseBody);
      throw conflictErr;
    }

    console.error(`[API] ${res.status} ${res.url}: ${errMsg}`, { responseBody, requestBody: options.body });
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  tasks: {
    list(params?: { since?: string; status?: string; include_deleted?: boolean; take?: number; cursor?: string }): Promise<TaskListResponse> {
      const query = new URLSearchParams();
      if (params?.since) query.set("since", params.since);
      if (params?.status) query.set("status", params.status);
      if (params?.include_deleted) query.set("include_deleted", "true");
      if (params?.take) query.set("take", String(params.take));
      if (params?.cursor) query.set("cursor", params.cursor);
      const qs = query.toString();
      return request<TaskListResponse>(`${BASE_URL}/tasks${qs ? `?${qs}` : ""}`);
    },

    create(payload: CreateTaskPayload): Promise<TaskResponse> {
      return request<TaskResponse>(`${BASE_URL}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    update(id: string, payload: UpdateTaskPayload): Promise<TaskResponse> {
      return request<TaskResponse>(`${BASE_URL}/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    delete(id: string): Promise<DeleteResponse> {
      return request<DeleteResponse>(`${BASE_URL}/tasks/${id}`, {
        method: "DELETE",
      });
    },

    getById(id: string): Promise<TaskResponse> {
      return request<TaskResponse>(`${BASE_URL}/tasks/${id}`);
    },
  },

  sync(payload: SyncPayload): Promise<SyncResponse> {
    return request<SyncResponse>(`${BASE_URL}/tasks/sync`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  analytics: {
    get(from?: string, to?: string): Promise<AnalyticsResponse> {
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const qs = query.toString();
      return request<AnalyticsResponse>(`${BASE_URL}/analytics${qs ? `?${qs}` : ""}`);
    },

    refresh(): Promise<{ ok: boolean }> {
      return request<{ ok: boolean }>(`${BASE_URL}/analytics/refresh`, { method: "POST" });
    },
  },
};
