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

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
  formData?: FormData;
}

export class APIError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = "APIError";
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, authenticated = true, formData } = options;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (!formData) {
    headers["Content-Type"] = "application/json";
  }

  if (authenticated) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = "An unexpected error occurred";
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === "string") {
        detail = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        detail = errorData.detail.map((e: { msg: string }) => e.msg).join(", ");
      }
    } catch {
      detail = response.statusText;
    }
    throw new APIError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
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
