const rawApiUrl = import.meta.env.VITE_API_URL ?? "";
export const API_BASE_URL = rawApiUrl.replace(/\/+$|\s+/g, "");

export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolved = typeof input === "string" ? apiUrl(input) : apiUrl(input.toString());
  return fetch(resolved, init);
}
