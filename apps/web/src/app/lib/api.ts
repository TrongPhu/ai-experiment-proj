export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type KnowledgeDocument = {
  id: string;
  title: string;
  source: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

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
