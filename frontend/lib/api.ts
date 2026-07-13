/**
 * Typed API client for CareerOS AI backend.
 * All requests go through this module — never fetch directly in components.
 */
import type {
  CareerProfile,
  ResumeAnalysis,
  TokenResponse,
  User,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─── Token Storage ─────────────────────────────────────────────────────────────
// Stored in memory + localStorage (access token only — short-lived)
// Refresh token is stored in httpOnly cookie set by the server in future sprints.

let _accessToken: string | null = null;

export function setAccessToken(token: string): void {
  _accessToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("careeros_at", token);
  }
}

export function getAccessToken(): string | null {
  if (_accessToken) return _accessToken;
  if (typeof window !== "undefined") {
    _accessToken = localStorage.getItem("careeros_at");
  }
  return _accessToken;
}

export function clearTokens(): void {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("careeros_at");
    localStorage.removeItem("careeros_rt");
  }
}

export function setRefreshToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("careeros_rt", token);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("careeros_rt");
  }
  return null;
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

import { apiClient, APIError } from "./api/client";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
  formData?: FormData;
}

export { APIError };

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, ...rest } = options;
  return apiClient<T>(path, {
    bodyData: body,
    ...rest,
  });
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data: {
    full_name: string;
    email: string;
    password: string;
  }): Promise<User> =>
    request<User>("/auth/register", {
      method: "POST",
      body: data,
      authenticated: false,
    }),

  login: (data: {
    email: string;
    password: string;
  }): Promise<TokenResponse & { refresh_token?: string }> =>
    request<TokenResponse & { refresh_token?: string }>("/auth/login", {
      method: "POST",
      body: data,
      authenticated: false,
    }),

  refresh: (refresh_token: string): Promise<TokenResponse> =>
    request<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      authenticated: false,
    }),

  logout: (): Promise<{ message: string }> =>
    request<{ message: string }>("/auth/logout", { method: "POST" }),

  getMe: (): Promise<User> =>
    request<User>("/auth/me"),

  deleteAccount: (): Promise<{ message: string }> =>
    request<{ message: string }>("/auth/account", { method: "DELETE" }),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersAPI = {
  getMe: (): Promise<User> => request<User>("/users/me"),

  updateMe: (data: { full_name?: string }): Promise<User> =>
    request<User>("/users/me", { method: "PATCH", body: data }),
};

// ─── Profile API ──────────────────────────────────────────────────────────────

export const profileAPI = {
  get: (): Promise<CareerProfile> => request<CareerProfile>("/profile"),

  update: (data: Partial<CareerProfile>): Promise<CareerProfile> =>
    request<CareerProfile>("/profile", { method: "PUT", body: data }),

  patchSection: (
    section: string,
    data: unknown
  ): Promise<CareerProfile> =>
    request<CareerProfile>(`/profile/section/${section}`, {
      method: "PATCH",
      body: { data },
    }),
};
