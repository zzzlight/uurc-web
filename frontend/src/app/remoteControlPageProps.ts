import type { KeyboardEvent, PointerEvent, RefObject, WheelEvent } from "react";

import type {
  RemoteControlBootstrap,
  RemoteSignalGatewayEvent,
  RemoteSignalReadinessDiagnostics,
  RuntimeProfile,
  UuDevice,
  UuParticipantInfo,
} from "@uurc/shared/types";

import type {
  BrowserRemoteSessionState,
  BrowserRemoteVideoElementSample,
} from "../remote/browserRemoteSession.js";
import type { RemoteShortcut } from "../remote/remoteShortcuts.js";
import type {
  BusyAction,
  ConnectionRouteMode,
  NextAction,
  RemoteConnectionQuality,
  RemoteStageViewMode,
  RemoteVideoStream,
  SdpTransportMode,
} from "./remoteControlTypes.js";

export interface RemoteControlPageProps {
  autoSwitchThresholdLabel: string;
  browserIceServers: number;
  browserRemoteState: BrowserRemoteSessionState;
  browserRtcDescription: string;
  browserRtcReady: boolean;
  browserStageLabel: string;
  busy: BusyAction;
  autoReconnectEnabled: boolean;
  autoReconnectLabel: string;
  canDisconnectRemote: boolean;
  canReadLocalClipboard: boolean;
  canReconnectRemote: boolean;
  canSendClipboardText: boolean;
  canSendRemoteText: boolean;
  candidatePairSummary: string;
  clipboardPreviewLabel: string;
  clipboardStatusLabel: string;
  connectionQuality: RemoteConnectionQuality;
  connectionPathLabel: string;
  connectionRouteMode: ConnectionRouteMode;
  controlChannelLabel: string;
  controlChannelState: RTCDataChannelState;
  debugEvents: BrowserRemoteSessionState["debugEvents"];
  effectiveConnectionRouteLabel: string;
  error: string;
  forceJoin: boolean;
  hasRemoteVideo: boolean;
  iceControlStatusLabel: string;
  inboundVideoStatsLabel: string;
  inputControlActive: boolean;
  inputControlLabel: string;
  joinModeLabel: string;
  networkSwitchSummary: string;
  nextAction: NextAction;
  normalJoinTakeoverHint: string;
  primaryRemoteVideoId: string;
  remoteBootstrap: RemoteControlBootstrap | null;
  remoteRecoveryLabel: string;
  remoteStageRef: RefObject<HTMLDivElement | null>;
  remoteStageViewMode: RemoteStageViewMode;
  remoteTextInput: string;
  remoteVideoCount: number;
  remoteVideoStreams: RemoteVideoStream[];
  roomDebugPayload: unknown;
  roomJoinFailureMessage: string;
  roomJoinFailureTakeoverHint: string;
  roomJoinModeDebugLabel: string;
  roomReleaseDetail: string;
  roomReleaseLabel: string;
  roomResponseReady: boolean;
  runtimeProfile: RuntimeProfile | null;
  roomRequiresTakeover: boolean;
  sdpTransportLabel: string;
  sdpTransportMode: SdpTransportMode;
  selectedDevice: UuDevice | null;
  selectedDeviceId: string;
  selectedDeviceOccupied: boolean;
  selectedParticipants: UuParticipantInfo[];
  selfDeviceBlockedReason: string;
  serviceRoutePolicyLabel: string;
  signalEvents: RemoteSignalGatewayEvent[];
  signalGatewayDisplay: string;
  signalGatewayErrorHint: string;
  signalHeaderSummary: string;
  signalReadiness: RemoteSignalReadinessDiagnostics;
  signalServerIndex: number;
  signalServerOptions: string[];
  textChannelLabel: string;
  textChannelState: RTCDataChannelState;
  unexpectedSignalEventSummary: string;
  videoElementLabel: string;
  videoFlowLabel: string;
  onConnectionRouteModeChange: (mode: ConnectionRouteMode) => void;
  onAutoReconnectEnabledChange: (enabled: boolean) => void;
  onForceJoinChange: (forceJoin: boolean) => void;
  onNextAction: () => void;
  onReconnectRemote: () => void;
  onRemoteStageKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onRemoteStageKeyUp: (event: KeyboardEvent<HTMLDivElement>) => void;
  onRemoteStagePointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStagePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStagePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStagePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStageWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onRemoteShortcut: (shortcut: RemoteShortcut) => void;
  onRemoteTextInputChange: (value: string) => void;
  onRemoteVideoSourceChange: (videoId: string) => void;
  onRemoteVideoSample: (videoId: string, sample: BrowserRemoteVideoElementSample) => void;
  onReadLocalClipboard: () => void;
  onReturnToDevices: () => void;
  onSdpTransportModeChange: (mode: SdpTransportMode) => void;
  onSendRemoteText: () => void;
  onSignalServerIndexChange: (index: number) => void;
  onStartBrowserRemote: () => void;
  onStartSignalGateway: () => void;
  onStageViewModeChange: (mode: RemoteStageViewMode) => void;
  onStopSignalGateway: () => void;
  onSyncSignalEvents: () => void;
  onSendClipboardText: () => void;
  onToggleInputControl: () => void;
  onToggleFullscreen: () => void;
}
