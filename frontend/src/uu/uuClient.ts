import { assertLoginState, decodeJwtPayload } from "@uurc/shared/authState";
import { DEVICE_GROUPS_PATH } from "@uurc/shared/constants";
import {
  buildAndroidDeviceInitRequest,
  buildMobileCodeRequest,
  buildMobileLoginRequest,
  normalizeDeviceInitResult,
  normalizeMobileLoginResult,
} from "@uurc/shared/loginFlow";
import { createRemoteControlBootstrap } from "@uurc/shared/remoteBootstrap";
import type {
  AndroidDeviceInitProfile,
  AuthStatus,
  LoginState,
  MobileLoginResult,
  RemoteControlBootstrap,
  RoomAppFlagUpdateInput,
  RoomAppFlagUpdateResult,
  RoomJoinResult,
  RoomJoinUpstreamSummary,
  UuRequest,
  UuResponse,
  UuTransport,
} from "@uurc/shared/types";

import { flattenDeviceGroups } from "../devices/deviceSummary.js";
import { LocalProxyTransport } from "../transport/localProxyTransport.js";
import {
  clearStoredLoginState,
  exportStoredLoginState,
  getStoredAuthStatus,
  getStoredLoginState,
  importStoredLoginState,
  patchStoredLoginState,
} from "./loginStateStore.js";
import { createSyntheticAndroidProfile } from "./profile.js";
import { clearRoomSession, getRoomSession, saveRoomJoinResult, summarizeUpstreamForClient } from "./roomSessionStore.js";
import { buildSignedHeaders, assertAllowedUuApiPath } from "./signing.js";

export class BrowserUuClient {
  constructor(private readonly transport: UuTransport = new LocalProxyTransport()) {}

  async signedRequest<TBody = unknown>({
    method,
    path,
    body,
    state = getStoredLoginState() ?? {},
    requireAuth = true,
  }: {
    method: string;
    path: string;
    body?: unknown;
    state?: Partial<LoginState>;
    requireAuth?: boolean;
  }): Promise<UuResponse<TBody>> {
    assertAllowedUuApiPath(path);
    if (requireAuth) {
      assertLoginState(state);
    }

    const bodyText = body === undefined ? "" : JSON.stringify(body);
    const headers = await buildSignedHeaders({
      state,
      method,
      pathWithQuery: path,
      body: bodyText,
    });
    if (bodyText) {
      headers["Content-Type"] = "application/json; charset=utf-8";
    }

    const response = await this.transport.request<TBody>({
      method,
      path,
      body,
      headers,
    });

    return {
      status: response.status,
      statusText: response.status === 200 ? "OK" : undefined,
      headers: response.headers,
      body: response.body,
    };
  }
}

const uuApi = new BrowserUuClient();

export function getAuthStatus(): AuthStatus {
  return getStoredAuthStatus();
}

export function clearAuthState(): AuthStatus {
  clearRoomSession();
  return clearStoredLoginState();
}

export function importAuthState(rawJson: string): AuthStatus {
  return importStoredLoginState(JSON.parse(rawJson));
}

export function exportAuthState(): LoginState {
  return exportStoredLoginState();
}

export async function createMobileDevice(profileOverrides: Partial<AndroidDeviceInitProfile> = {}): Promise<{ status: AuthStatus; deviceId: string; upstream: UuResponse }> {
  const currentState = getStoredLoginState() ?? {};
  if (currentState.deviceId) {
    return {
      status: getStoredAuthStatus(),
      deviceId: currentState.deviceId,
      upstream: {
        status: 200,
        statusText: "Already Initialized",
        headers: {},
        body: { code: 0, data: { device_id: currentState.deviceId }, local: true },
      },
    };
  }

  const { state, profile } = createSyntheticAndroidProfile(currentState, profileOverrides);
  const request = buildAndroidDeviceInitRequest(profile);
  const upstream = await uuApi.signedRequest({
    state,
    method: request.method,
    path: request.path,
    body: request.body,
    requireAuth: false,
  });
  assertUpstreamOk(upstream.body);

  const deviceId = normalizeDeviceInitResult(upstream.body);
  const status = patchStoredLoginState({
    ...state,
    deviceId,
  });

  return { status, deviceId, upstream };
}

export async function sendMobileCode(input: { regionCode: string; mobile: string }): Promise<{ status: AuthStatus; deviceId: string; upstream: UuResponse }> {
  const device = await createMobileDevice();
  const request = buildMobileCodeRequest(normalizeMobileInput(input));
  const upstream = await uuApi.signedRequest({
    state: getStoredLoginState() ?? {},
    method: request.method,
    path: request.path,
    body: request.body,
    requireAuth: false,
  });
  assertUpstreamOk(upstream.body);

  return {
    status: getStoredAuthStatus(),
    deviceId: device.deviceId,
    upstream,
  };
}

export async function loginByMobile(input: { regionCode: string; mobile: string; code: string }): Promise<{ status: AuthStatus; login: Omit<MobileLoginResult, "token">; upstream: UuResponse }> {
  await createMobileDevice();
  const request = buildMobileLoginRequest(normalizeMobileLoginInput(input));
  const upstream = await uuApi.signedRequest({
    state: getStoredLoginState() ?? {},
    method: request.method,
    path: request.path,
    body: request.body,
    requireAuth: false,
  });
  assertUpstreamOk(upstream.body);

  const login = normalizeMobileLoginResult(upstream.body);
  const payload = decodeJwtPayload(login.token);
  const tokenClientId = typeof payload.client_id === "string" ? payload.client_id : "";
  const status = patchStoredLoginState({
    token: login.token,
    userId: login.userId,
    clientId: getStoredLoginState()?.clientId || tokenClientId,
  });

  return {
    status,
    login: {
      userId: login.userId,
      nickName: login.nickName,
    },
    upstream,
  };
}

export async function getDeviceGroups() {
  const response = await uuApi.signedRequest({ method: "GET", path: DEVICE_GROUPS_PATH });
  return flattenDeviceGroups(response);
}

export async function joinRoomByDevice(deviceId: string, forceJoin: boolean): Promise<RoomJoinResult> {
  const upstream = await uuApi.signedRequest({
    method: "POST",
    path: `/api/v1/room/join/by_device/${encodeURIComponent(deviceId)}`,
    body: { force_join: forceJoin },
  });
  return saveRoomJoinResult({ deviceId, forceJoin, upstream });
}

export async function clearRoomByDevice(deviceId: string): Promise<RoomJoinUpstreamSummary> {
  const upstream = await uuApi.signedRequest({
    method: "POST",
    path: `/api/v1/room/clear/by_device/${encodeURIComponent(deviceId)}`,
  });
  return summarizeUpstreamForClient(upstream);
}

export async function updateRoomAppFlag(input: RoomAppFlagUpdateInput): Promise<RoomAppFlagUpdateResult> {
  const upstream = await uuApi.signedRequest({
    method: "POST",
    path: "/api/v1/room/app_flag",
    body: {
      publisher_device_id: input.publisherDeviceId,
      app_flag: {
        control_mode: input.controlMode,
      },
    },
  });

  return {
    upstream: summarizeUpstreamForClient(upstream),
    appFlag: {
      controlMode: input.controlMode,
    },
  };
}

export function getRemoteBootstrap(): RemoteControlBootstrap {
  const session = getRoomSession();
  if (!session) {
    throw new Error("Join a room before starting remote control");
  }
  const bootstrap = createRemoteControlBootstrap({
    roomConfig: session.roomConfig,
    joinContext: session.joinContext,
  });
  if (!bootstrap) {
    throw new Error("Room config is incomplete");
  }
  return bootstrap;
}

export function getRemoteSignalStartContext() {
  const session = getRoomSession();
  if (!session) {
    throw new Error("Join a room before starting remote control");
  }
  return {
    roomConfig: session.roomConfig,
    joinContext: session.joinContext,
  };
}

function normalizeMobileInput(input: { regionCode: string; mobile: string }) {
  const regionCode = input.regionCode.trim() || "86";
  const mobile = input.mobile.trim();
  if (!mobile) {
    throw new Error("mobile is required");
  }
  return { regionCode, mobile };
}

function normalizeMobileLoginInput(input: { regionCode: string; mobile: string; code: string }) {
  const normalized = normalizeMobileInput(input);
  const code = input.code.trim();
  if (!code) {
    throw new Error("code is required");
  }
  return { ...normalized, code };
}

function assertUpstreamOk(body: unknown): void {
  if (!isRecord(body)) return;
  const code = body.code;
  if (typeof code === "number" && code !== 0) {
    const message = typeof body.msg === "string" ? body.msg : typeof body.message === "string" ? body.message : `UU upstream code ${code}`;
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
