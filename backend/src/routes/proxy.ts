import { Router } from "express";
import {
  API_BASE,
  assertAllowedUuApiPath,
  parseMaybeJsonBody,
  sanitizeUuProxyHeaders,
  type UuResponse,
} from "@uurc/shared";

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
      assertAllowedUuApiPath(path);
      res.json(await forwardUuRequest(fetcher, {
        method,
        path,
        body,
        headers: sanitizeUuProxyHeaders(headers),
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
    body: parseMaybeJsonBody(responseText, contentType) as TBody,
  };
}
