const BLOCKED_PROXY_HEADERS = new Set(["host", "connection", "content-length", "transfer-encoding"]);

export function assertAllowedUuApiPath(path: string): void {
  if (!path.startsWith("/api/v1/")) {
    throw new Error(`Unsupported UU API path: ${path}`);
  }
  if (/^https?:\/\//i.test(path) || path.includes("..")) {
    throw new Error(`Unsafe UU API path: ${path}`);
  }
}

export function sanitizeUuProxyHeaders(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const headers: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" && isForwardableUuProxyHeader(key)) {
      headers[key] = raw;
    }
  }
  return headers;
}

export function isForwardableUuProxyHeader(name: string): boolean {
  return !BLOCKED_PROXY_HEADERS.has(name.toLowerCase());
}

export function parseMaybeJsonBody(text: string, contentType: string): unknown {
  if (!text) return null;
  if (!contentType.includes("application/json")) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
