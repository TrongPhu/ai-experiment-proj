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
  refreshToken: string;
  user: AuthUser;
};

export const authTokenKey = "ai-experiment-auth-token";
export const refreshTokenKey = "ai-experiment-refresh-token";

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(authTokenKey);
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(authTokenKey, token);
}

export function setRefreshToken(token: string) {
  window.localStorage.setItem(refreshTokenKey, token);
}

export function getRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(refreshTokenKey);
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenKey);
  window.localStorage.removeItem(refreshTokenKey);
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
  let response = await fetch(url, options);

  if (response.status === 401 && shouldTryRefresh(url)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await fetch(url, withAuthHeaders(options));
    }
  }

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

function shouldTryRefresh(url: string) {
  const refreshToken = getRefreshToken();

  return (
    Boolean(refreshToken) &&
    !url.includes("/auth/login") &&
    !url.includes("/auth/register") &&
    !url.includes("/auth/google") &&
    !url.includes("/auth/refresh")
  );
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAuthToken();
    return false;
  }

  const session = (await response.json()) as AuthSession;
  setAuthToken(session.accessToken);
  setRefreshToken(session.refreshToken);
  return true;
}
