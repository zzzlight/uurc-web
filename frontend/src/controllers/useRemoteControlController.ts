import type { KeyboardEvent, PointerEvent, WheelEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMatch, useNavigate } from "react-router";

import {
  STREAMER_CONTROL_CONNECT_TYPES,
  STREAMER_DATA_CHANNEL_LABELS,
  analyzeRemoteSignalReadiness,
  buildDefaultStreamerConnectOptionsBase64,
  buildStreamerControlStreamerDataJson,
} from "@uurc/shared/streamerProtocol";
import type {
  AuthStatus,
  RemoteControlBootstrap,
  RemoteSignalGatewayEvent,
  RemoteSignalGatewayStatus,
  RemoteSignalReadinessDiagnostics,
  RuntimeProfile,
  RemoteAssistanceJoinResult,
  RoomJoinResult,
  UuDeviceGroups,
} from "@uurc/shared/types";

import type {
  BusyAction,
  ConnectionRouteMode,
  RemoteStageViewMode,
  RemoteVideoSamplesById,
  RemoteVideoStream,
  RoomJoinContext,
  SdpTransportMode,
} from "../app/remoteControlTypes.js";
import { SELF_DEVICE_BLOCKED_REASON } from "../app/remoteControlTypes.js";
import {
  cancelRemoteAssistance,
  clearAuthState,
  clearRoomByDevice,
  createMobileDevice,
  exportAuthState,
  getAuthStatus,
  getDeviceGroups,
  getRemoteAssistanceControlMode,
  getRemoteBootstrap,
  getRuntimeProfile,
  getRemoteSignalDiagnostics,
  getRemoteSignalEvents,
  importAuthState,
  joinRemoteAssistanceByCode,
  joinRemoteAssistanceByConfirmation,
  joinRoomByDevice,
  loginByMobile,
  sendMobileCode,
  sendRemoteSignalControl,
  sendRemoteSignalSoac,
  startRemoteSignalGateway,
  stopRemoteSignalGateway,
} from "../api/client.js";
import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";
import { readLocalClipboardText } from "../browser/clipboard.js";
import { pickControllableDesktop } from "../devices/deviceSummary.js";
import { BrowserRemoteSession, type BrowserRemoteSessionState, type BrowserRemoteVideoElementSample } from "../remote/browserRemoteSession.js";
import { sendRemoteShortcut, type RemoteShortcut } from "../remote/remoteShortcuts.js";
import {
  createAppControlId,
  createIdleBrowserRemoteState,
  createSingleTrackMediaStream,
  formatAutoSwitchThresholds,
  formatBrowserRemoteStage,
  formatConnectionPath,
  formatDataChannelState,
  getRemoteConnectionQuality,
  formatInboundVideoStats,
  formatRemoteAssistanceMode,
  formatRoomJoinContext,
  formatRoomReleaseDetail,
  formatRoomReleaseState,
  formatSignalGatewayErrorHint,
  formatSignalGatewayState,
  formatVideoElement,
  formatVideoFlow,
  getNextAction,
  getRoomJoinFailureMessage,
  getRoomJoinFailureTakeoverHint,
  resolvePrimaryRemoteVideoId,
  summarizeRoomJoinUpstream,
  summarizeSwitchNetworkNotify,
  summarizeUnexpectedSignalEvents,
  toRemoteKeyValue,
  toRemoteMouseButton,
  toRemoteMousePosition,
} from "../remote/remoteControlUiModel.js";
import { useAutoLoadDevices } from "./useAutoLoadDevices.js";

const REMOTE_ASSISTANCE_DEFAULT_TARGET_PLATFORM = 1;

export function useRemoteControlController() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authJson, setAuthJson] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [mobile, setMobile] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [devices, setDevices] = useState<UuDeviceGroups>({ desktopDevices: [], mobileDevices: [], tvDevices: [] });
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [selectedDeviceIdState, setSelectedDeviceId] = useState("");
  const [forceJoin, setForceJoin] = useState(false);
  const [assistanceConnectId, setAssistanceConnectId] = useState("");
  const [assistanceConnectCode, setAssistanceConnectCode] = useState("");
  const [assistanceNotice, setAssistanceNotice] = useState("");
  const [assistanceTargetPlatform, setAssistanceTargetPlatform] = useState<number>(REMOTE_ASSISTANCE_DEFAULT_TARGET_PLATFORM);
  const [roomResponse, setRoomResponse] = useState<RoomJoinResult | null>(null);
  const [roomJoinContext, setRoomJoinContext] = useState<RoomJoinContext | null>(null);
  const [signalGatewayContext, setSignalGatewayContext] = useState<RoomJoinContext | null>(null);
  const [remoteBootstrap, setRemoteBootstrap] = useState<RemoteControlBootstrap | null>(null);
  const [signalGatewayStatus, setSignalGatewayStatus] = useState<RemoteSignalGatewayStatus | null>(null);
  const [signalEvents, setSignalEvents] = useState<RemoteSignalGatewayEvent[]>([]);
  const [remoteSignalDiagnostics, setRemoteSignalDiagnostics] = useState<RemoteSignalReadinessDiagnostics | null>(null);
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfile | null>(null);
  const [browserRemoteState, setBrowserRemoteState] = useState<BrowserRemoteSessionState>(createIdleBrowserRemoteState);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<RemoteVideoStream[]>([]);
  const [remoteVideoSamplesById, setRemoteVideoSamplesById] = useState<RemoteVideoSamplesById>({});
  const [selectedRemoteVideoId, setSelectedRemoteVideoId] = useState("");
  const [remoteTextInput, setRemoteTextInput] = useState("");
  const [clipboardText, setClipboardText] = useState("");
  const [clipboardStatus, setClipboardStatus] = useState("尚未读取本机剪贴板");
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);
  const [autoReconnectAttemptCount, setAutoReconnectAttemptCount] = useState(0);
  const [autoReconnectStatus, setAutoReconnectStatus] = useState("");
  const [inputControlEnabled, setInputControlEnabled] = useState(false);
  const [sdpTransportMode, setSdpTransportMode] = useState<SdpTransportMode>("gzip");
  const [connectionRouteMode, setConnectionRouteMode] = useState<ConnectionRouteMode>("auto");
  const [remoteStageViewMode, setRemoteStageViewMode] = useState<RemoteStageViewMode>("fit");
  const [signalServerIndex, setSignalServerIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<BusyAction>("status");
  const browserRemoteSession = useRef<BrowserRemoteSession | null>(null);
  const remoteStageRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const navigate = useNavigate();
  const controlRouteMatch = useMatch("/devices/:deviceId/control");
  const routeSelectedDeviceId = controlRouteMatch?.params.deviceId ?? "";

  const allDevices = useMemo(
    () => [...devices.desktopDevices, ...devices.mobileDevices, ...devices.tvDevices],
    [devices.desktopDevices, devices.mobileDevices, devices.tvDevices],
  );
  const selectedDeviceId = routeSelectedDeviceId || selectedDeviceIdState;

  const selectedDevice = useMemo(
    () => allDevices.find((device) => device.deviceId === selectedDeviceId) ?? null,
    [allDevices, selectedDeviceId],
  );
  const localSignalReadiness = useMemo(
    () =>
      analyzeRemoteSignalReadiness({
        events: signalEvents,
        signalStatus: signalGatewayStatus,
      }),
    [signalEvents, signalGatewayStatus],
  );
  const signalReadiness = remoteSignalDiagnostics ?? localSignalReadiness;
  const selectedParticipants = selectedDevice?.participantsInfo ?? [];
  const selectedDeviceOccupied = selectedParticipants.length > 0;
  const primaryRemoteVideoId = useMemo(
    () => resolvePrimaryRemoteVideoId(remoteVideoStreams, remoteVideoSamplesById, selectedRemoteVideoId),
    [remoteVideoSamplesById, remoteVideoStreams, selectedRemoteVideoId],
  );

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    const serverCount = remoteBootstrap?.signalServers.length ?? 0;
    if (serverCount > 0 && signalServerIndex >= serverCount) {
      setSignalServerIndex(0);
    }
  }, [remoteBootstrap?.signalServers.length, signalServerIndex]);

  useEffect(() => {
    if (signalGatewayStatus?.status !== "connected" || browserRemoteState.stage === "idle") return;

    let stopped = false;
    let syncing = false;
    const sync = async () => {
      if (stopped || syncing || !browserRemoteSession.current) return;
      syncing = true;
      try {
        await applyLatestSignalEvents();
      } catch (caught) {
        if (!stopped) setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        syncing = false;
      }
    };

    void sync();
    const timer = window.setInterval(sync, 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [signalGatewayStatus?.status, browserRemoteState.stage]);

  async function run(action: BusyAction, task: () => Promise<void>) {
    setBusy(action);
    setError("");
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function loadStatus() {
    await run("status", async () => {
      const [status, runtime] = await Promise.all([
        getAuthStatus(),
        getRuntimeProfile().catch(() => null),
      ]);
      setAuthStatus(status);
      setRuntimeProfile(runtime);
    });
  }

  async function handleImport() {
    await run("import", async () => {
      setAuthStatus(await importAuthState(authJson));
      setLoginNotice("已导入");
      setDevicesLoaded(false);
      navigate("/devices", { replace: true });
    });
  }

  async function handleExport() {
    await run("export", async () => {
      const state = await exportAuthState();
      setAuthJson(JSON.stringify(state, null, 2));
    });
  }

  async function handleLogout() {
    await run("logout", async () => {
      resetBrowserRemoteSession();
      setAuthStatus(await clearAuthState());
      setAuthJson("");
      setDevices({ desktopDevices: [], mobileDevices: [], tvDevices: [] });
      setDevicesLoaded(false);
      setSelectedDeviceId("");
      setForceJoin(false);
      setAssistanceConnectId("");
      setAssistanceConnectCode("");
      setAssistanceNotice("");
      setAssistanceTargetPlatform(REMOTE_ASSISTANCE_DEFAULT_TARGET_PLATFORM);
      setRoomResponse(null);
      setRoomJoinContext(null);
      setSignalGatewayContext(null);
      setRemoteBootstrap(null);
      setSignalGatewayStatus(null);
      setSignalEvents([]);
      setRemoteSignalDiagnostics(null);
      setLoginNotice("");
      navigate("/login", { replace: true });
    });
  }

  async function ensureMobileDevice() {
    if (authStatus?.deviceId) return;
    const result = await createMobileDevice();
    setAuthStatus(result.status);
  }

  async function handleSendMobileCode() {
    await run("send-mobile-code", async () => {
      await ensureMobileDevice();
      const result = await sendMobileCode({ regionCode: regionCode.trim() || "86", mobile });
      setAuthStatus(result.status);
      setLoginNotice("验证码已发送");
    });
  }

  async function handleMobileLogin() {
    await run("mobile-login", async () => {
      await ensureMobileDevice();
      const result = await loginByMobile({ regionCode: regionCode.trim() || "86", mobile, code: smsCode });
      setAuthStatus(result.status);
      setLoginNotice("已登录");
      setDevicesLoaded(false);
      navigate("/devices", { replace: true });
    });
  }

  async function loadDevices() {
    await run("devices", async () => {
      const nextDevices = await getDeviceGroups();
      setDevices(nextDevices);
      setDevicesLoaded(true);
      const target = pickControllableDesktop(nextDevices.desktopDevices, authStatus?.deviceId);
      setSelectedDeviceId(target?.deviceId ?? nextDevices.desktopDevices[0]?.deviceId ?? "");
    });
  }

  async function handleJoinRoom(joinWithForce = forceJoin) {
    await joinRoomForDevice(selectedDeviceId, joinWithForce);
  }

  async function handleOpenDevice(deviceId: string) {
    setSelectedDeviceId(deviceId);
    navigate(`/devices/${encodeURIComponent(deviceId)}/control`);
  }

  async function handleStartRemoteAssistance() {
    if (busy !== null) return;
    if (!loggedIn) {
      setError("远程协助需要先登录 UU 账号。");
      return;
    }

    await run("assistance", async () => {
      const connectId = assistanceConnectId.trim();
      const connectCode = assistanceConnectCode.trim();
      const modeResult = await getRemoteAssistanceControlMode(connectId);
      if (modeResult.upstream.body.code !== undefined && modeResult.upstream.body.code !== 0) {
        throw new Error(modeResult.upstream.body.msg ?? `远程协助模式返回 ${modeResult.upstream.body.code}`);
      }
      if (!modeResult.canRemoteControl) {
        throw new Error("伙伴设备当前不允许远程协助");
      }
      if (!modeResult.controlMode) {
        throw new Error("伙伴设备未返回可识别的验证方式");
      }

      let joined: RemoteAssistanceJoinResult;
      if (connectCode) {
        joined = await joinRemoteAssistanceByCode({
          connectId,
          connectCode,
          controlMode: modeResult.controlMode,
          targetPlatform: assistanceTargetPlatform,
        });
        if (!joined.roomConfigSummary && joined.assistance.confirmationRequired) {
          setAssistanceNotice("伙伴设备要求二次确认，正在等待对方确认...");
          joined = await joinRemoteAssistanceByConfirmation({
            connectId,
            connectCode,
            controlId: joined.assistance.controlId,
            controlMode: modeResult.controlMode,
            targetPlatform: assistanceTargetPlatform,
          });
        }
      } else if (modeResult.controlMode === "by_confirmation") {
        setAssistanceNotice("正在等待伙伴设备确认...");
        joined = await joinRemoteAssistanceByConfirmation({
          connectId,
          controlMode: modeResult.controlMode,
          targetPlatform: assistanceTargetPlatform,
        });
      } else {
        throw new Error("伙伴设备当前要求输入设备验证码");
      }

      if (!joined.roomConfigSummary) {
        throw new Error(joined.upstream.body.msg ?? "远程协助未返回可用房间配置");
      }

      const context: RoomJoinContext = {
        kind: "remote_assistance",
        deviceId: joined.assistance.connectId,
        forceJoin: false,
        occupiedAtJoin: false,
        connectId: joined.assistance.connectId,
        connectCodeProvided: joined.assistance.connectCodeProvided,
        controlId: joined.assistance.controlId,
        controlMode: joined.assistance.controlMode,
        deviceName: joined.assistance.deviceName,
        targetPlatform: joined.assistance.targetPlatform ?? assistanceTargetPlatform,
      };
      setSelectedDeviceId(joined.assistance.connectId);
      setRoomResponse(joined);
      setRoomJoinContext(context);
      setForceJoin(false);
      setSignalGatewayContext(null);
      setSignalGatewayStatus(null);
      setSignalEvents([]);
      setRemoteSignalDiagnostics(null);
      resetBrowserRemoteSession();
      setRemoteBootstrap(await getRemoteBootstrap());
      setAssistanceNotice(`已进入远程协助：${formatRemoteAssistanceMode(modeResult.controlMode)}`);
      navigate(`/devices/${encodeURIComponent(joined.assistance.connectId)}/control`);
    });
  }

  async function joinRoomForDevice(deviceId: string, joinWithForce = forceJoin): Promise<RoomJoinContext | null> {
    if (!deviceId) return null;
    let nextContext: RoomJoinContext | null = null;
    await run("join", async () => {
      if (deviceId === authStatus?.deviceId) {
        throw new Error(SELF_DEVICE_BLOCKED_REASON);
      }
      const device = allDevices.find((item) => item.deviceId === deviceId) ?? null;
      const context = {
        kind: "owned_device" as const,
        deviceId,
        forceJoin: joinWithForce,
        occupiedAtJoin: (device?.participantsInfo?.length ?? 0) > 0,
      };
      const joined = await joinRoomByDevice(deviceId, joinWithForce);
      setRoomResponse(joined);
      setRoomJoinContext(context);
      setForceJoin(joinWithForce);
      setSignalGatewayContext(null);
      setSignalGatewayStatus(null);
      setSignalEvents([]);
      setRemoteSignalDiagnostics(null);
      setAssistanceNotice("");
      resetBrowserRemoteSession();
      setRemoteBootstrap(joined.roomConfigSummary ? await getRemoteBootstrap() : null);
      nextContext = context;
    });
    return nextContext;
  }

  async function handleStartSignalGateway(context = roomJoinContext): Promise<RemoteSignalGatewayStatus | null> {
    let nextStatus: RemoteSignalGatewayStatus | null = null;
    await run("signal-start", async () => {
      if (!context || context.deviceId !== selectedDeviceId) {
        throw new Error("请先加入房间");
      }
      const status = await startRemoteSignalGateway({
        gzipSdp: sdpTransportMode === "gzip",
        signalServerIndex: signalServerIndex > 0 ? signalServerIndex : undefined,
      });
      nextStatus = status;
      setSignalGatewayStatus(status);
      setSignalGatewayContext(status.status === "connected" ? context : null);
      setRemoteSignalDiagnostics(await getRemoteSignalDiagnostics());
    });
    return nextStatus;
  }

  async function handleStopSignalGateway() {
    await run("signal-stop", async () => {
      resetBrowserRemoteSession();
      const stopped = await stopRemoteSignalGateway();
      let nextStatus = stopped;
      const clearContext = roomJoinContext;
      if (clearContext?.deviceId) {
        try {
          nextStatus = {
            ...stopped,
            roomClear: clearContext.kind === "remote_assistance"
              ? await cancelRemoteAssistance(clearContext.connectId ?? clearContext.deviceId)
              : await clearRoomByDevice(clearContext.deviceId),
            updatedAt: new Date().toISOString(),
          };
        } catch (caught) {
          nextStatus = {
            ...stopped,
            roomClearError: caught instanceof Error ? caught.message : String(caught),
            updatedAt: new Date().toISOString(),
          };
        }
      }
      setSignalGatewayStatus(nextStatus);
      setSignalGatewayContext(null);
      setRemoteSignalDiagnostics(null);
      if (nextStatus.roomClear && (nextStatus.roomClear.body.code === undefined || nextStatus.roomClear.body.code === 0)) {
        setRoomJoinContext((current) => current ? { ...current, occupiedAtJoin: false } : current);
      }
      if (clearContext?.kind !== "remote_assistance") {
        try {
          setDevices(await getDeviceGroups());
        } catch {
          // Disconnect should still complete even if the follow-up device refresh fails.
        }
      }
    });
  }

  async function handleReturnToDevices() {
    if (busy !== null) return;
    if (canDisconnectRemote || roomJoinContext?.deviceId) {
      await handleStopSignalGateway();
    }
    navigate("/devices");
  }

  function resetBrowserRemoteSession() {
    const closedState = browserRemoteSession.current?.close();
    browserRemoteSession.current = null;
    activePointerId.current = null;
    setInputControlEnabled(false);
    setRemoteVideoStreams([]);
    setRemoteVideoSamplesById({});
    setBrowserRemoteState(closedState ?? createIdleBrowserRemoteState());
  }

  async function startBrowserRemoteSession(options: { skipReadinessCheck?: boolean } = {}) {
    if (!authStatus?.deviceId) throw new Error("登录已失效");
    if (!selectedDeviceId) throw new Error("请选择设备");
    if (!options.skipReadinessCheck && !roomReadyForBrowserRtc) throw new Error(browserRtcBlockedReason);
    setInputControlEnabled(false);
    const appControlId = createAppControlId();
    const session = new BrowserRemoteSession({
      api: {
        sendSignalControl: sendRemoteSignalControl,
        sendSignalSoac: sendRemoteSignalSoac,
      },
      onRemoteStream: handleRemoteMediaStream,
      onStateChange: setBrowserRemoteState,
    });
    browserRemoteSession.current = session;
    const controlConnectType = roomJoinContext?.kind === "remote_assistance"
      ? STREAMER_CONTROL_CONNECT_TYPES.ControlConnectType_Assistance
      : STREAMER_CONTROL_CONNECT_TYPES.ControlConnectType_Normal;
    const state = await session.start({
      appControlId,
      appDataBase64: buildDefaultStreamerConnectOptionsBase64({
        deviceId: authStatus.deviceId,
        controlConnectType,
      }),
      streamerData: buildStreamerControlStreamerDataJson({ controlId: appControlId }),
      forceRelay: connectionRouteMode === "relay" ? true : undefined,
      gzipSdp: sdpTransportMode === "gzip",
      targetPlatform: roomJoinContext?.kind === "remote_assistance"
        ? roomJoinContext.targetPlatform
        : selectedDevice?.platform,
    });
    setBrowserRemoteState(state);
    await applyLatestSignalEvents(session);
  }

  async function handleStartBrowserRemote(options: { skipReadinessCheck?: boolean } = {}) {
    await run("browser-remote-start", async () => {
      await startBrowserRemoteSession(options);
    });
  }

  async function handleReconnectRemote() {
    await run("reconnect", async () => {
      resetBrowserRemoteSession();
      if (!signalGatewayMatchesRoom) {
        const status = await startRemoteSignalGateway({
          gzipSdp: sdpTransportMode === "gzip",
          signalServerIndex: signalServerIndex > 0 ? signalServerIndex : undefined,
        });
        setSignalGatewayStatus(status);
        setSignalGatewayContext(status.status === "connected" ? roomJoinContext : null);
        setRemoteSignalDiagnostics(await getRemoteSignalDiagnostics());
        if (status.status !== "connected") {
          throw new Error(formatSignalGatewayErrorHint(status) || "连接服务未启动");
        }
      }
      if (typeof RTCPeerConnection !== "undefined") {
        await startBrowserRemoteSession({ skipReadinessCheck: true });
      }
    });
  }

  async function handleSyncSignalEvents() {
    await run("signal-events", async () => {
      await applyLatestSignalEvents();
    });
  }

  async function applyLatestSignalEvents(session = browserRemoteSession.current) {
    const events = await getRemoteSignalEvents();
    const diagnostics = await getRemoteSignalDiagnostics();
    setSignalEvents(events);
    setRemoteSignalDiagnostics(diagnostics);
    if (session) {
      await session.applySignalEvents(events);
      await session.refreshConnectionStats();
      setBrowserRemoteState(session.getState());
    }
  }

  async function handleNextAction() {
    if (busy !== null) return;
    if (!loggedIn) {
      setError("请先登录");
      return;
    }
    if (!selectedDeviceId || (deviceTotal === 0 && roomJoinContext?.kind !== "remote_assistance")) {
      await loadDevices();
      return;
    }
    if (!roomJoinedForSelectedDevice || roomRequiresTakeover || signalGatewayState === "error") {
      const nextContext = await joinRoomForDevice(selectedDeviceId, roomRequiresTakeover ? true : forceJoin);
      if (!nextContext || (nextContext.occupiedAtJoin && !nextContext.forceJoin)) return;
      const status = await handleStartSignalGateway(nextContext);
      if (status?.status === "connected" && typeof RTCPeerConnection !== "undefined") {
        await handleStartBrowserRemote({ skipReadinessCheck: true });
      }
      return;
    }
    if (!signalGatewayMatchesRoom) {
      const status = await handleStartSignalGateway();
      if (status?.status === "connected" && typeof RTCPeerConnection !== "undefined") {
        await handleStartBrowserRemote({ skipReadinessCheck: true });
      }
      return;
    }
    if (browserRemoteState.stage === "idle") {
      await handleStartBrowserRemote();
      return;
    }
    if (browserConnectionRecoverable) {
      await handleReconnectRemote();
      return;
    }
    if (!inputControlActive && controlChannelState === "open") {
      setInputControlEnabled(true);
      remoteStageRef.current?.focus();
      return;
    }
    await handleSyncSignalEvents();
  }

  function handleRemoteMediaStream(stream: MediaStream) {
    const tracks = typeof stream.getVideoTracks === "function" ? stream.getVideoTracks() : [];
    setRemoteVideoStreams(
      tracks.map((track, index) => ({
        id: track.id || `video-${index + 1}`,
        stream: createSingleTrackMediaStream(track),
      })),
    );
    setRemoteVideoSamplesById({});
  }

  const handleRemoteVideoSample = useCallback((videoId: string, sample: BrowserRemoteVideoElementSample) => {
    setRemoteVideoSamplesById((current) => ({ ...current, [videoId]: sample }));
    const nextState = browserRemoteSession.current?.recordVideoElementSample(sample);
    if (nextState) setBrowserRemoteState(nextState);
  }, []);

  function handleSendRemoteText() {
    try {
      browserRemoteSession.current?.sendTextData(remoteTextInput);
      setRemoteTextInput("");
      if (browserRemoteSession.current) setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function handleReadLocalClipboard() {
    await run("clipboard-read", async () => {
      const text = await readLocalClipboardText();
      if (typeof text !== "string") {
        setClipboardStatus("当前浏览器未返回剪贴板文本");
        return;
      }
      setClipboardText(text);
      setClipboardStatus(text.trim() ? `已读取 ${text.length} 字符` : "剪贴板为空");
    });
  }

  function handleSendClipboardText() {
    if (!clipboardText.trim() || !browserRemoteSession.current) return;
    try {
      browserRemoteSession.current.sendTextData(clipboardText);
      setClipboardStatus(`已发送 ${clipboardText.length} 字符到远端`);
      if (browserRemoteSession.current) setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteShortcut(shortcut: RemoteShortcut) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    try {
      sendRemoteShortcut(browserRemoteSession.current, shortcut);
      setBrowserRemoteState(browserRemoteSession.current.getState());
      remoteStageRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleToggleFullscreen() {
    const stage = remoteStageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.();
        return;
      }
      void stage.requestFullscreen?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleToggleInputControl() {
    if (inputControlActive) {
      setInputControlEnabled(false);
      return;
    }
    if (controlChannelState !== "open") return;
    setInputControlEnabled(true);
    remoteStageRef.current?.focus();
  }

  function handleRemoteStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    activePointerId.current = event.pointerId;
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    try {
      browserRemoteSession.current.sendMouseMove(toRemoteMousePosition(event));
      browserRemoteSession.current.sendMouseButton({ action: "mousePress", button: toRemoteMouseButton(event.button) });
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStagePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    if (activePointerId.current !== null && activePointerId.current !== event.pointerId) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendMouseMove(toRemoteMousePosition(event));
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStagePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    if (activePointerId.current !== null && activePointerId.current !== event.pointerId) return;
    event.preventDefault();
    activePointerId.current = null;
    if (typeof event.currentTarget.releasePointerCapture === "function" && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    try {
      browserRemoteSession.current.sendMouseMove(toRemoteMousePosition(event));
      browserRemoteSession.current.sendMouseButton({ action: "mouseRelease", button: toRemoteMouseButton(event.button) });
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStagePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    if (!inputControlActive || !browserRemoteSession.current) return;
    try {
      browserRemoteSession.current.sendMouseButton({ action: "mouseRelease", button: toRemoteMouseButton(event.button) });
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageWheel(event: WheelEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendMouseScroll({ deltaX: event.deltaX, deltaY: event.deltaY });
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current || event.repeat) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendKeyboardInput({ action: "keyboardPress", value: toRemoteKeyValue(event) });
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendKeyboardInput({ action: "keyboardRelease", value: toRemoteKeyValue(event) });
      setBrowserRemoteState(browserRemoteSession.current.getState());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const loggedIn = Boolean(authStatus?.hasState);
  const deviceTotal = devices.desktopDevices.length + devices.mobileDevices.length + devices.tvDevices.length;
  const canSubmitMobile = mobile.trim().length > 0 && busy === null;
  const canLogin = mobile.trim().length > 0 && smsCode.trim().length > 0 && busy === null;

  useAutoLoadDevices({
    loggedIn,
    devicesLoaded,
    busy,
    loadDevices: () => void loadDevices(),
  });

  const identitySourceLabel = authStatus?.deviceId ? "网页控制端" : "待创建设备";
  const identityDeviceLabel = authStatus?.deviceId ?? "-";
  const roomDebugPayload = roomResponse
    ? {
        upstream: summarizeRoomJoinUpstream(roomResponse.upstream),
        roomConfigSummary: roomResponse.roomConfigSummary,
        sessionReference: roomResponse.sessionReference,
        remoteBootstrap,
        signalGatewayStatus,
        remoteSignalDiagnostics,
        roomJoinContext,
        signalGatewayContext,
      }
    : null;
  const signalGatewayState = signalGatewayStatus?.status ?? "idle";
  const activeSignalHeaders = signalGatewayStatus?.signalHeaders ?? remoteBootstrap?.signalHeaders;
  const signalHeaderSummary = activeSignalHeaders ? Object.entries(activeSignalHeaders).map(([key, value]) => `${key}=${value}`).join(", ") : "-";
  const roomJoinFailureMessage = getRoomJoinFailureMessage(roomResponse);
  const roomJoinFailureTakeoverHint = getRoomJoinFailureTakeoverHint(roomResponse, forceJoin);
  const selectedDeviceIsCurrentAuthDevice = Boolean(authStatus?.deviceId && selectedDeviceId && selectedDeviceId === authStatus.deviceId);
  const selfDeviceBlockedReason = selectedDeviceIsCurrentAuthDevice ? SELF_DEVICE_BLOCKED_REASON : "";
  const roomJoinedForSelectedDevice = roomJoinContext?.deviceId === selectedDeviceId && Boolean(roomResponse?.roomConfigSummary);
  const roomRequiresTakeover = roomJoinedForSelectedDevice && roomJoinContext?.occupiedAtJoin === true && !roomJoinContext.forceJoin;
  const signalGatewayMatchesRoom =
    signalGatewayState === "connected" &&
    signalGatewayContext?.deviceId === roomJoinContext?.deviceId &&
    signalGatewayContext?.forceJoin === roomJoinContext?.forceJoin &&
    (signalGatewayContext?.kind ?? "owned_device") === (roomJoinContext?.kind ?? "owned_device");
  const roomReadyForBrowserRtc = roomJoinedForSelectedDevice && !roomRequiresTakeover && signalGatewayMatchesRoom;
  const browserRtcBlockedReason = selfDeviceBlockedReason
    ? selfDeviceBlockedReason
    : roomJoinFailureMessage
      ? roomJoinFailureMessage
      : !roomJoinedForSelectedDevice
        ? "请先加入房间"
        : roomRequiresTakeover
          ? "选择接管后重试"
          : !signalGatewayMatchesRoom
            ? "重新连接"
            : "";
  const normalJoinLeftBeforeAnswer =
    roomJoinContext?.forceJoin === false &&
    signalReadiness.blocker === "controlled_left_before_answer" &&
    signalReadiness.checks.offerSent &&
    !signalReadiness.checks.answerReceived;
  const normalJoinTakeoverHint = normalJoinLeftBeforeAnswer ? "画面未返回。" : "";
  const browserRtcReady = roomReadyForBrowserRtc && busy === null;
  const browserIceServers = browserRemoteState.controlResult?.iceServers.length ?? 0;
  const connectionPathLabel = formatConnectionPath(browserRemoteState.connectionPath);
  const inboundVideoStatsLabel = formatInboundVideoStats(browserRemoteState.inboundVideo);
  const videoFlowLabel = formatVideoFlow(browserRemoteState);
  const videoElementLabel = formatVideoElement(browserRemoteState.videoElement);
  const textChannelState = browserRemoteState.dataChannels[STREAMER_DATA_CHANNEL_LABELS.text] ?? "closed";
  const controlChannelState = browserRemoteState.dataChannels[STREAMER_DATA_CHANNEL_LABELS.control] ?? "closed";
  const controlChannelLabel = formatDataChannelState(controlChannelState);
  const textChannelLabel = formatDataChannelState(textChannelState);
  const inputControlActive = inputControlEnabled && controlChannelState === "open";
  const inputControlLabel = inputControlActive
    ? "已启用"
    : controlChannelState === "open"
      ? "已锁定"
      : controlChannelLabel;
  const canSendRemoteText = inputControlActive && textChannelState === "open" && remoteTextInput.trim().length > 0;
  const browserConnectionRecoverable =
    browserRemoteState.stage === "connected" &&
    (controlChannelState === "closed" || browserRemoteState.videoFlow?.status === "transport_stalled");
  const remoteRecoveryLabel = browserConnectionRecoverable
    ? controlChannelState === "closed"
      ? "控制通道已断开"
      : "视频链路已停滞"
    : "";
  const autoReconnectLabel = browserConnectionRecoverable && autoReconnectEnabled
    ? autoReconnectStatus || "自动重连准备中"
    : autoReconnectEnabled
      ? "自动重连已开启"
      : "自动重连已关闭";
  const canReadLocalClipboard = busy === null;
  const canSendClipboardText = inputControlActive && textChannelState === "open" && clipboardText.trim().length > 0;
  const clipboardPreviewLabel = clipboardText.trim() ? `${clipboardText.length} 字符待发送` : "剪贴板内容未读取";
  const connectionQuality = getRemoteConnectionQuality({
    state: browserRemoteState,
    controlChannelState,
    inputControlActive,
    textChannelState,
    connectionPathLabel,
  });

  useEffect(() => {
    if (!browserConnectionRecoverable) {
      if (autoReconnectAttemptCount !== 0) setAutoReconnectAttemptCount(0);
      if (autoReconnectStatus) setAutoReconnectStatus("");
      return;
    }
    if (!autoReconnectEnabled || busy !== null || !roomJoinedForSelectedDevice || !signalGatewayMatchesRoom) return;

    const delayMs = Math.min(5000, 900 * 2 ** Math.min(autoReconnectAttemptCount, 3));
    setAutoReconnectStatus(`自动重连将在 ${Math.ceil(delayMs / 1000)} 秒后尝试`);
    const timer = window.setTimeout(() => {
      setAutoReconnectAttemptCount((count) => count + 1);
      void handleReconnectRemote();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    autoReconnectAttemptCount,
    autoReconnectEnabled,
    autoReconnectStatus,
    browserConnectionRecoverable,
    busy,
    roomJoinedForSelectedDevice,
    signalGatewayMatchesRoom,
  ]);
  const selectedCandidatePair = browserRemoteState.selectedCandidatePair;
  const candidatePairSummary = selectedCandidatePair
    ? `${selectedCandidatePair.localCandidateType ?? "-"} -> ${selectedCandidatePair.remoteCandidateType ?? "-"}`
    : "-";
  const networkSwitchSummary = summarizeSwitchNetworkNotify(signalEvents);
  const unexpectedSignalEventSummary = summarizeUnexpectedSignalEvents(signalEvents, remoteBootstrap?.signalEvents ?? []);
  const signalServerOptions = remoteBootstrap?.signalServers ?? [];
  const signalGatewayErrorHint = formatSignalGatewayErrorHint(signalGatewayStatus);
  const autoSwitchThresholdLabel = formatAutoSwitchThresholds(browserRemoteState.controlResult);
  const sdpTransportLabel = sdpTransportMode === "gzip" ? "gzip_sdp" : "plain_sdp";
  const connectionRouteLabel = connectionRouteMode === "relay" ? "强制中转" : "自动路径";
  const effectiveConnectionRouteLabel =
    connectionRouteMode === "relay"
      ? "强制中转"
      : browserRemoteState.controlResult?.forceRelay
        ? "服务端要求中转"
        : connectionRouteLabel;
  const serviceRoutePolicyLabel = browserRemoteState.controlResult?.forceRelay
    ? "服务端要求中转"
    : browserRemoteState.controlResult?.autoSwitchNetwork
      ? "服务端自动切换"
      : "-";
  const iceControlStatusLabel =
    browserRemoteState.controlResultIceId
      ? browserRemoteState.controlIceIdMatch === undefined
        ? "使用 ack ICE"
        : browserRemoteState.controlIceIdMatch
          ? "ack ICE 已对齐"
          : "ack ICE 覆盖本地候选"
      : browserRemoteState.iceId
        ? "ICE 等待 ack"
        : "-";
  const signalGatewayDisplay = formatSignalGatewayState(signalGatewayState);
  const browserStageLabel = formatBrowserRemoteStage(browserRemoteState.stage);
  const browserRtcDescription = browserRemoteState.controlResult ? "连接许可已确认" : "等待连接确认";
  const joinModeLabel = forceJoin ? "接管控制" : "普通加入";
  const roomJoinModeDebugLabel = formatRoomJoinContext(remoteBootstrap?.joinContext);
  const selectedTargetLabel = roomJoinContext?.kind === "remote_assistance"
    ? roomJoinContext.deviceName ?? `远程协助 ${roomJoinContext.connectId ?? roomJoinContext.deviceId}`
    : selectedDevice?.alias ?? "远控画面";
  const remoteVideoCount = remoteVideoStreams.length;
  const debugEvents = browserRemoteState.debugEvents;
  const hasRemoteVideo = remoteVideoCount > 0;
  const canDisconnectRemote =
    signalGatewayState === "connected" ||
    browserRemoteState.stage !== "idle" ||
    remoteVideoCount > 0 ||
    controlChannelState !== "closed" ||
    textChannelState !== "closed";
  const roomReleaseLabel = formatRoomReleaseState(signalGatewayStatus, canDisconnectRemote, selectedDeviceOccupied, roomJoinContext);
  const roomReleaseDetail = formatRoomReleaseDetail(signalGatewayStatus, roomJoinContext);
  const nextAction = getNextAction({
    busy,
    browserConnectionRecoverable,
    controlChannelState,
    deviceTotal,
    inputControlActive,
    loggedIn,
    roomJoinedForSelectedDevice,
    remoteAssistanceTarget: roomJoinContext?.kind === "remote_assistance",
    roomRequiresTakeover,
    selectedDeviceId,
    selectedDeviceIsCurrentAuthDevice,
    signalGatewayErrored: signalGatewayState === "error",
    signalGatewayMatchesRoom,
    browserStage: browserRemoteState.stage,
    forceJoin,
  });

  useEffect(() => {
    if (controlChannelState !== "open" && inputControlEnabled) {
      setInputControlEnabled(false);
    }
  }, [controlChannelState, inputControlEnabled]);

  const loginPageProps = {
    authJson,
    regionCode,
    mobile,
    smsCode,
    loginNotice,
    error,
    busy,
    canSubmitMobile,
    canLogin,
    onAuthJsonChange: setAuthJson,
    onRegionCodeChange: setRegionCode,
    onMobileChange: setMobile,
    onSmsCodeChange: setSmsCode,
    onSendMobileCode: () => void handleSendMobileCode(),
    onMobileLogin: () => void handleMobileLogin(),
    onImport: () => void handleImport(),
  };

  const deviceListPageProps = {
    authStatus,
    authJson,
    devices,
    selectedDeviceId,
    assistanceConnectId,
    assistanceConnectCode,
    assistanceNotice,
    assistanceTargetPlatform,
    identitySourceLabel,
    identityDeviceLabel,
    error,
    busy,
    onLoadStatus: () => void loadStatus(),
    onLoadDevices: () => void loadDevices(),
    onSelectDevice: setSelectedDeviceId,
    onOpenDevice: (deviceId: string) => void handleOpenDevice(deviceId),
    onAssistanceConnectIdChange: setAssistanceConnectId,
    onAssistanceConnectCodeChange: setAssistanceConnectCode,
    onAssistanceTargetPlatformChange: setAssistanceTargetPlatform,
    onStartRemoteAssistance: () => void handleStartRemoteAssistance(),
    onExport: () => void handleExport(),
    onLogout: () => void handleLogout(),
  };

  const controlPageProps: RemoteControlPageProps = {
    autoSwitchThresholdLabel,
    autoReconnectEnabled,
    autoReconnectLabel,
    browserIceServers,
    browserRemoteState,
    browserRtcDescription,
    browserRtcReady,
    browserStageLabel,
    busy,
    canDisconnectRemote,
    canReadLocalClipboard,
    canReconnectRemote: browserConnectionRecoverable,
    canSendClipboardText,
    canSendRemoteText,
    candidatePairSummary,
    clipboardPreviewLabel,
    clipboardStatusLabel: clipboardStatus,
    connectionQuality,
    connectionPathLabel,
    connectionRouteMode,
    controlChannelLabel,
    controlChannelState,
    debugEvents,
    effectiveConnectionRouteLabel,
    error,
    forceJoin,
    hasRemoteVideo,
    iceControlStatusLabel,
    inboundVideoStatsLabel,
    inputControlActive,
    inputControlLabel,
    joinModeLabel,
    networkSwitchSummary,
    nextAction,
    normalJoinTakeoverHint,
    primaryRemoteVideoId,
    remoteBootstrap,
    remoteRecoveryLabel,
    remoteStageRef,
    remoteStageViewMode,
    remoteTextInput,
    remoteVideoCount,
    remoteVideoStreams,
    roomDebugPayload,
    roomJoinFailureMessage,
    roomJoinFailureTakeoverHint,
    roomJoinModeDebugLabel,
    roomReleaseDetail,
    roomReleaseLabel,
    roomResponseReady: Boolean(roomResponse),
    runtimeProfile,
    roomRequiresTakeover,
    sdpTransportLabel,
    sdpTransportMode,
    selectedDevice,
    selectedDeviceId,
    selectedTargetLabel,
    selectedDeviceOccupied,
    selectedParticipants,
    selfDeviceBlockedReason,
    serviceRoutePolicyLabel,
    signalEvents,
    signalGatewayDisplay,
    signalGatewayErrorHint,
    signalHeaderSummary,
    signalReadiness,
    signalServerIndex,
    signalServerOptions,
    textChannelLabel,
    textChannelState,
    unexpectedSignalEventSummary,
    videoElementLabel,
    videoFlowLabel,
    onAutoReconnectEnabledChange: setAutoReconnectEnabled,
    onConnectionRouteModeChange: setConnectionRouteMode,
    onForceJoinChange: setForceJoin,
    onNextAction: () => void handleNextAction(),
    onReconnectRemote: () => void handleReconnectRemote(),
    onRemoteStageKeyDown: handleRemoteStageKeyDown,
    onRemoteStageKeyUp: handleRemoteStageKeyUp,
    onRemoteStagePointerCancel: handleRemoteStagePointerCancel,
    onRemoteStagePointerDown: handleRemoteStagePointerDown,
    onRemoteStagePointerMove: handleRemoteStagePointerMove,
    onRemoteStagePointerUp: handleRemoteStagePointerUp,
    onRemoteStageWheel: handleRemoteStageWheel,
    onRemoteShortcut: handleRemoteShortcut,
    onRemoteTextInputChange: setRemoteTextInput,
    onRemoteVideoSourceChange: setSelectedRemoteVideoId,
    onRemoteVideoSample: handleRemoteVideoSample,
    onReadLocalClipboard: () => void handleReadLocalClipboard(),
    onReturnToDevices: () => void handleReturnToDevices(),
    onSdpTransportModeChange: setSdpTransportMode,
    onSendRemoteText: handleSendRemoteText,
    onSignalServerIndexChange: setSignalServerIndex,
    onStartBrowserRemote: () => void handleStartBrowserRemote(),
    onStartSignalGateway: () => void handleStartSignalGateway(),
    onStageViewModeChange: setRemoteStageViewMode,
    onStopSignalGateway: () => void handleStopSignalGateway(),
    onSyncSignalEvents: () => void handleSyncSignalEvents(),
    onSendClipboardText: handleSendClipboardText,
    onToggleInputControl: handleToggleInputControl,
    onToggleFullscreen: handleToggleFullscreen,
  };

  return {
    authLoading: authStatus === null && busy === "status",
    loggedIn,
    loginPageProps,
    deviceListPageProps,
    controlPageProps,
  };
}
