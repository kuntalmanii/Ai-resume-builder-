/**
 * Typed API client for CareerOS AI backend.
 * All requests go through this module — never fetch directly in components.
 */
import type {
  CareerProfile,
  Resume,
  ResumeContent,
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
  get: (): Promise<CareerProfile> => request<CareerProfile>("/career-profile"),

  update: (data: Partial<CareerProfile>): Promise<CareerProfile> =>
    request<CareerProfile>("/career-profile", { method: "PATCH", body: data }),
};

// ─── Career Entries API ──────────────────────────────────────────────────────

export interface CareerEntry {
  id: string;
  user_id: string;
  entry_type: string;
  title: string;
  organization: string;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  data: Record<string, any>;
  verification_status: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export const careerEntriesAPI = {
  list: (entryType?: string): Promise<CareerEntry[]> => {
    const query = entryType ? `?entry_type=${encodeURIComponent(entryType)}` : "";
    return request<CareerEntry[]>(`/career-profile/entries${query}`);
  },

  get: (id: string): Promise<CareerEntry> =>
    request<CareerEntry>(`/career-profile/entries/${id}`),

  create: (data: {
    entry_type: string;
    title: string;
    organization: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    data?: Record<string, any>;
    source_type?: string;
  }): Promise<CareerEntry> =>
    request<CareerEntry>("/career-profile/entries", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: {
    title?: string;
    organization?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    data?: Record<string, any>;
  }): Promise<CareerEntry> =>
    request<CareerEntry>(`/career-profile/entries/${id}`, {
      method: "PATCH",
      body: data,
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`/career-profile/entries/${id}`, {
      method: "DELETE",
    }),

  confirm: (id: string): Promise<CareerEntry> =>
    request<CareerEntry>(`/career-profile/entries/${id}/confirm`, {
      method: "POST",
    }),
};

// ─── Resumes API ──────────────────────────────────────────────────────────────

export interface ResumeVersionResponse {
  id: string;
  resume_id: string;
  version_number: number;
  content_snapshot: ResumeContent;
  change_reason?: string | null;
  created_at: string;
}

export const resumesAPI = {
  list: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Resume[]> => {
    if (!params) return request<Resume[]>("/resumes");
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    return request<Resume[]>(`/resumes?${searchParams.toString()}`);
  },

  get: (id: string): Promise<Resume> => request<Resume>(`/resumes/${id}`),

  create: (data: {
    title: string;
    template_id?: string;
    content?: ResumeContent;
    raw_text?: string;
    status?: string;
    is_primary?: boolean;
    source_type?: string;
  }): Promise<Resume> =>
    request<Resume>("/resumes", { method: "POST", body: data }),

  patchMetadata: (
    id: string,
    data: {
      title?: string;
      template_id?: string;
      is_primary?: boolean;
      status?: string;
    }
  ): Promise<Resume> =>
    request<Resume>(`/resumes/${id}`, {
      method: "PATCH",
      body: data,
    }),

  updateContent: (
    id: string,
    content: ResumeContent,
    expectedVersion?: number,
    changeReason?: string
  ): Promise<Resume> => {
    const params = new URLSearchParams();
    if (expectedVersion !== undefined) params.append("expected_version", String(expectedVersion));
    if (changeReason) params.append("change_reason", changeReason);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Resume>(`/resumes/${id}/content${query}`, {
      method: "PUT",
      body: content,
    });
  },

  delete: (id: string): Promise<void> =>
    request<void>(`/resumes/${id}`, { method: "DELETE" }),

  duplicate: (id: string): Promise<Resume> =>
    request<Resume>(`/resumes/${id}/duplicate`, { method: "POST" }),

  setPrimary: (id: string): Promise<Resume> =>
    request<Resume>(`/resumes/${id}/primary`, { method: "POST" }),

  listVersions: (id: string): Promise<ResumeVersionResponse[]> =>
    request<ResumeVersionResponse[]>(`/resumes/${id}/versions`),

  restoreVersion: (id: string, versionNumber: number): Promise<Resume> =>
    request<Resume>(`/resumes/${id}/versions/${versionNumber}/restore`, {
      method: "POST",
    }),
};

// ─── Job Descriptions API ─────────────────────────────────────────────────────

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  company: string;
  raw_text: string;
  source_filename?: string | null;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export const jobDescriptionsAPI = {
  list: (): Promise<JobDescription[]> => request<JobDescription[]>("/job-descriptions"),

  get: (id: string): Promise<JobDescription> => request<JobDescription>(`/job-descriptions/${id}`),

  create: (data: {
    title: string;
    company: string;
    raw_text: string;
    source_filename?: string;
    source_type?: string;
  }): Promise<JobDescription> =>
    request<JobDescription>("/job-descriptions", { method: "POST", body: data }),

  update: (id: string, data: Partial<JobDescription>): Promise<JobDescription> =>
    request<JobDescription>(`/job-descriptions/${id}`, { method: "PUT", body: data }),

  delete: (id: string): Promise<void> =>
    request<void>(`/job-descriptions/${id}`, { method: "DELETE" }),
};
