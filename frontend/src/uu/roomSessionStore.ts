import {
  normalizeStreamerRoomConfig,
  summarizeStreamerRoomConfig,
} from "@uurc/shared/roomConfig";
import type {
  RemoteRoomJoinContext,
  RoomJoinResult,
  RoomJoinUpstreamSummary,
  StreamerRoomConfig,
  UuResponse,
} from "@uurc/shared/types";

const ROOM_SESSION_KEY = "uurc.latestRoomSession";

export interface BrowserRoomSession {
  capturedAt: string;
  joinContext: RemoteRoomJoinContext;
  roomConfig: StreamerRoomConfig;
  upstream: RoomJoinUpstreamSummary;
}

export function saveRoomJoinResult(input: {
  deviceId: string;
  forceJoin: boolean;
  upstream: UuResponse;
}): RoomJoinResult {
  const roomConfig = normalizeStreamerRoomConfig(input.upstream.body);
  const upstream = summarizeUpstreamForClient(input.upstream);
  const capturedAt = new Date().toISOString();
  const joinContext: RemoteRoomJoinContext = {
    capturedAt,
    deviceId: input.deviceId,
    forceJoin: input.forceJoin,
  };

  if (roomConfig) {
    const session: BrowserRoomSession = {
      capturedAt,
      joinContext,
      roomConfig,
      upstream,
    };
    window.sessionStorage.setItem(ROOM_SESSION_KEY, JSON.stringify(session));
  } else {
    clearRoomSession();
  }

  return {
    upstream,
    roomConfig: null,
    roomConfigSummary: summarizeStreamerRoomConfig(roomConfig),
    sessionReference: {
      browserStoragePath: `browser:sessionStorage:${ROOM_SESSION_KEY}`,
      summaryPath: `browser:memory:redacted-room-summary`,
    },
  };
}

export function getRoomSession(): BrowserRoomSession | null {
  const raw = window.sessionStorage.getItem(ROOM_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as BrowserRoomSession;
    if (!parsed.roomConfig?.token || !parsed.roomConfig.signalServers?.length) return null;
    return parsed;
  } catch {
    clearRoomSession();
    return null;
  }
}

export function clearRoomSession(): void {
  window.sessionStorage.removeItem(ROOM_SESSION_KEY);
}

export function summarizeUpstreamForClient(upstream: UuResponse): RoomJoinUpstreamSummary {
  const body = asRecord(upstream.body);
  const data = asRecord(body?.data);
  return {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: pickSafeHeaders(upstream.headers),
    body: {
      code: numberValue(body?.code),
      msg: stringValue(body?.msg),
      dataKeys: data ? Object.keys(data) : undefined,
    },
  };
}

function pickSafeHeaders(headers: Record<string, string>): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  for (const key of ["content-type", "date", "server"]) {
    if (headers[key]) safeHeaders[key] = headers[key];
  }
  return safeHeaders;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
