export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type KnowledgeDocument = {
  id: string;
  title: string;
  source: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export const authTokenKey = "ai-experiment-auth-token";

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(authTokenKey);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(authTokenKey, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenKey);
}

export function withAuthHeaders(options: RequestInit = {}): RequestInit {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...options,
    headers,
  };
}

export async function requestJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const detail = await response.text();
    let message = detail || `Request failed with ${response.status}`;

    try {
      const parsed = JSON.parse(detail) as { message?: unknown };
      if (typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // Keep the raw response body when the API does not return JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
