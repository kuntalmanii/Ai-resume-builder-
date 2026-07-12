
/**
 * Centralized HTTP client wrapper for CareerOS AI REST APIs.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class APIError extends Error {
  public detail: string;
  constructor(public status: number, message: string) {
    super(message);
    this.detail = message;
    this.name = "APIError";
  }
}

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
  bodyData?: unknown;
  formData?: FormData;
}

/**
 * Standardized HTTP fetch wrapper.
 */
export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", bodyData, authenticated = true, formData, ...rest } = options;

  const headers: Record<string, string> = {};

  if (!formData) {
    headers["Content-Type"] = "application/json";
  }

  // Inject authentication header if required
  if (authenticated && typeof window !== "undefined") {
    const token = localStorage.getItem("careeros_at");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Merge custom headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData ? formData : bodyData ? JSON.stringify(bodyData) : undefined,
      ...rest,
    });
  } catch (error) {
    // Network or client connection error
    throw new APIError(0, "Failed to connect to backend server. Please verify network status.");
  }

  // Handle Token Refresh on 401 Unauthorized
  if (response.status === 401 && authenticated && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshToken = localStorage.getItem("careeros_rt");
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          localStorage.setItem("careeros_at", newTokens.access_token);
          if (newTokens.refresh_token) {
            localStorage.setItem("careeros_rt", newTokens.refresh_token);
          }

          // Update header and retry the request
          headers["Authorization"] = `Bearer ${newTokens.access_token}`;
          response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: formData ? formData : bodyData ? JSON.stringify(bodyData) : undefined,
            ...rest,
          });
        } else {
          // Token expired or invalid, clear credentials and redirect
          localStorage.removeItem("careeros_at");
          localStorage.removeItem("careeros_rt");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } catch {
        localStorage.removeItem("careeros_at");
        localStorage.removeItem("careeros_rt");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
  }

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
      detail = response.statusText || "Server error";
    }
    throw new APIError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Health check utility capable of checking backend connectivity.
 */
export async function checkConnectivity(): Promise<{
  connected: boolean;
  status?: string;
  apiVersion?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        status: data.status,
        apiVersion: "v1",
      };
    }
    return { connected: false, error: `Server responded with status: ${response.status}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
