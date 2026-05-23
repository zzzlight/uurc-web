import type { BrowserRemoteVideoElementSample } from "../remote/browserRemoteSession.js";

export type BusyAction =
  | "status"
  | "import"
  | "export"
  | "send-mobile-code"
  | "mobile-login"
  | "devices"
  | "join"
  | "logout"
  | "signal-start"
  | "signal-stop"
  | "browser-remote-start"
  | "reconnect"
  | "signal-events"
  | null;

export type SdpTransportMode = "gzip" | "plain";
export type ConnectionRouteMode = "auto" | "relay";
export type RemoteStageViewMode = "fit" | "fill";

export type RoomJoinContext = {
  deviceId: string;
  forceJoin: boolean;
  occupiedAtJoin: boolean;
};

export type RemoteVideoStream = {
  id: string;
  stream: MediaStream;
};

export type NextAction = {
  label: string;
  detail: string;
  disabled: boolean;
};

export type RemoteVideoSamplesById = Record<string, BrowserRemoteVideoElementSample>;

export const SELF_DEVICE_BLOCKED_REASON = "不能控制当前设备。";
