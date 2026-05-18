import { Router } from "express";
import { API_BASE, type UuResponse } from "@uurc/shared";

type FetchLike = typeof fetch;

export function createProxyRouter(fetcher: FetchLike = fetch): Router {
  const router = Router();

  router.post("/proxy/uu", async (req, res, next) => {
    try {
      const { method, path, body, headers } = req.body ?? {};
      if (typeof method !== "string" || typeof path !== "string") {
        res.status(400).json({ error: "method and path are required" });
        return;
      }
      assertAllowedApiPath(path);
      res.json(await forwardUuRequest(fetcher, {
        method,
        path,
        body,
        headers: sanitizeProxyHeaders(headers),
      }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function forwardUuRequest<TBody = unknown>(
  fetcher: FetchLike,
  request: {
    method: string;
    path: string;
    body?: unknown;
    headers: Record<string, string>;
  },
): Promise<UuResponse<TBody>> {
  const bodyText = request.body === undefined ? "" : JSON.stringify(request.body);
  const response = await fetcher(`${API_BASE}${request.path}`, {
    method: request.method,
    headers: request.headers,
    body: bodyText || undefined,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const responseText = await response.text();

  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body: parseBody(responseText, contentType) as TBody,
  };
}

export function assertAllowedApiPath(path: string): void {
  if (!path.startsWith("/api/v1/")) {
    throw new Error(`Unsupported UU API path: ${path}`);
  }
  if (/^https?:\/\//i.test(path) || path.includes("..")) {
    throw new Error(`Unsafe UU API path: ${path}`);
  }
}

function sanitizeProxyHeaders(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const headers: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "string" || !isForwardableHeader(key)) continue;
    headers[key] = raw;
  }
  return headers;
}

function isForwardableHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return !["host", "connection", "content-length", "transfer-encoding"].includes(lower);
}

function parseBody(text: string, contentType: string): unknown {
  if (!text) return null;
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}
