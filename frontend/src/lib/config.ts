const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredApiBaseUrl || "http://localhost:8082"
).replace(/\/$/, "");

export function intelligenceApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}/api/v1/intelligence${normalizedPath}`;
}
