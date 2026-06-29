import type { ClipboardEvent, KeyboardEvent, PointerEvent, WheelEvent } from "react";
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
  const [regionCode, setRegionCode] = useState("86");
  const [mobile, setMobile] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
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
  const [decodeStalledStreak, setDecodeStalledStreak] = useState(0);
  const [autoReconnectStatus, setAutoReconnectStatus] = useState("");
  const [inputControlEnabled, setInputControlEnabled] = useState(false);
  const [sdpTransportMode, setSdpTransportMode] = useState<SdpTransportMode>("gzip");
  const [connectionRouteMode, setConnectionRouteMode] = useState<ConnectionRouteMode>("auto");
  const [remoteStageViewMode, setRemoteStageViewMode] = useState<RemoteStageViewMode>("fit");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [signalServerIndex, setSignalServerIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<BusyAction>("status");
  const browserRemoteSession = useRef<BrowserRemoteSession | null>(null);
  const remoteStageRef = useRef<HTMLDivElement | null>(null);
  const remoteStageFrameRef = useRef<HTMLDivElement | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在挂载时恢复一次登录态
  }, []);

  const smsCounting = smsCountdown > 0;
  useEffect(() => {
    if (!smsCounting) return;
    const timer = window.setInterval(() => setSmsCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [smsCounting]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
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
    // 建链阶段（answer/ICE 尚未就绪）加快轮询，更快应用信令、缩短连接耗时；
    // 连上后回到 1.5s 稳态，避免稳定期不必要的请求与重渲染。
    const intervalMs = browserRemoteState.stage === "connected" ? 1500 : 600;
    const timer = window.setInterval(sync, intervalMs);
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
      // 远程协助失败时清除“等待对方确认…”等瞬态提示，避免与错误条同时显示矛盾信息
      if (action === "assistance") setAssistanceNotice("");
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
      const status = await importAuthState(authJson);
      setAuthStatus(status);
      if (!status.hasState) {
        const fieldLabels: Record<string, string> = { token: "令牌", userId: "用户 ID", deviceId: "设备 ID" };
        const missing = (status.missingFields ?? []).map((field) => fieldLabels[field] ?? field).join("、");
        throw new Error(missing ? `导入失败：登录态缺少 ${missing}` : "导入失败：登录态不完整");
      }
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
    if (typeof window !== "undefined" && !window.confirm("退出后需重新登录。若未导出登录态备份，建议先导出。确定退出？")) {
      return;
    }
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
      setCodeSent(false);
      setSmsCountdown(0);
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
      setCodeSent(true);
      setSmsCountdown(60);
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

    setAssistanceNotice("");
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
    const hasActiveSession = canDisconnectRemote || Boolean(roomJoinContext?.deviceId);
    if (hasActiveSession) {
      const message =
        roomJoinContext?.kind === "remote_assistance"
          ? "返回将断开当前远控并取消本次远程协助，确定返回？"
          : "返回将断开当前远控并释放 UU 房间占用，确定返回？";
      if (typeof window !== "undefined" && !window.confirm(message)) return;
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
      onRemoteClipboard: handleRemoteClipboard,
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

  function handleRemoteClipboard(text: string) {
    // 反向剪贴板同步：被控端剪贴板变化时回传文本，写入本机剪贴板（失败则保留在面板供手动处理）。
    if (!text) return;
    setClipboardText(text);
    void writeRemoteClipboardToLocal(text);
  }

  async function writeRemoteClipboardToLocal(text: string) {
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      setClipboardStatus(`已收到远端剪贴板（${text.length} 字符），当前环境不支持写入本机剪贴板`);
      return;
    }
    try {
      await clipboard.writeText(text);
      setClipboardStatus(`已同步远端剪贴板到本机（${text.length} 字符）`);
    } catch {
      setClipboardStatus(`已收到远端剪贴板（${text.length} 字符），写入本机被拒绝，可在剪贴板面板手动处理`);
    }
  }

  async function handleReadLocalClipboard() {
    await run("clipboard-read", async () => {
      try {
        const text = await readLocalClipboardText();
        if (typeof text !== "string") {
          setClipboardStatus("当前浏览器未返回剪贴板文本");
          return;
        }
        setClipboardText(text);
        setClipboardStatus(text.trim() ? `已读取 ${text.length} 字符` : "剪贴板为空");
      } catch (caught) {
        // 就地反馈到剪贴板面板，不打扰全局错误条；权限/非安全上下文是最常见原因。
        setClipboardStatus(
          `无法读取本机剪贴板（需在 HTTPS 或 localhost 下访问并授予剪贴板权限）：${caught instanceof Error ? caught.message : String(caught)}`,
        );
      }
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
    // 对包含命令栏的容器请求全屏，避免全屏后命令栏（解锁输入/退出全屏等）一并消失。
    const target = remoteStageFrameRef.current ?? remoteStageRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.();
        return;
      }
      void target.requestFullscreen?.();
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
      // 输入热路径不主动刷新 React 状态：鼠标/键盘操作不改变任何可见 UI，
      // 而 getState() 每次返回新引用会强制整页重渲染，挤占主线程并拖慢控制心跳。
      // 通道开/关等真正的状态变化由 BrowserRemoteSession 内部在变化时单独推送。
      browserRemoteSession.current.sendMouseMove(toRemoteMousePosition(event));
      browserRemoteSession.current.sendMouseButton({ action: "mousePress", button: toRemoteMouseButton(event.button) });
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageWheel(event: WheelEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendMouseScroll({ deltaX: event.deltaX, deltaY: event.deltaY });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current || event.repeat) return;
    // Ctrl/Cmd+V 走“把本机剪贴板粘到远端”（onPaste 处理），不把 V 当普通按键发给远端，
    // 否则远端会再粘一次它自己的剪贴板。
    if ((event.ctrlKey || event.metaKey) && (event.key === "v" || event.key === "V")) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendKeyboardInput({ action: "keyboardPress", value: toRemoteKeyValue(event) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageKeyUp(event: KeyboardEvent<HTMLDivElement>) {
    if (!inputControlActive || !browserRemoteSession.current) return;
    if ((event.ctrlKey || event.metaKey) && (event.key === "v" || event.key === "V")) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendKeyboardInput({ action: "keyboardRelease", value: toRemoteKeyValue(event) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function handleRemoteStageBlur() {
    // 失焦时把按住的键鼠全部抬起：Alt+Tab、右键菜单、系统快捷键会吞掉 keyup/pointerup，
    // 否则会在被控端留下卡住的按键（右键卡死、Alt 卡死等）。
    activePointerId.current = null;
    browserRemoteSession.current?.releaseAllInputs();
  }

  function handleRemoteStagePaste(event: ClipboardEvent<HTMLDivElement>) {
    // 直接粘贴：Ctrl/Cmd+V 时把本机剪贴板文本经文本通道发到远端（无需打开剪贴板面板）。
    if (!inputControlActive || !browserRemoteSession.current) return;
    const text = event.clipboardData?.getData("text") ?? "";
    if (!text) return;
    event.preventDefault();
    try {
      browserRemoteSession.current.sendTextData(text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const loggedIn = Boolean(authStatus?.hasState);
  const deviceTotal = devices.desktopDevices.length + devices.mobileDevices.length + devices.tvDevices.length;
  const canSubmitMobile = mobile.trim().length > 0 && busy === null && smsCountdown === 0;
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
  const decodeStalledPersisted =
    browserRemoteState.videoFlow?.status === "decode_stalled" && decodeStalledStreak >= 2;
  const browserConnectionRecoverable =
    browserRemoteState.stage === "connected" &&
    (controlChannelState === "closed" ||
      browserRemoteState.videoFlow?.status === "transport_stalled" ||
      decodeStalledPersisted);
  const remoteRecoveryLabel = browserConnectionRecoverable
    ? controlChannelState === "closed"
      ? "控制通道已断开"
      : decodeStalledPersisted
        ? "画面解码停滞"
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
    // 累计连续“解码停滞”采样数：要求持续 ≥2 次才触发自动恢复，避免偶发解码抖动误重连。
    setDecodeStalledStreak((streak) =>
      browserRemoteState.videoFlow?.status === "decode_stalled" ? streak + 1 : 0,
    );
  }, [browserRemoteState.videoFlow]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleReconnectRemote 每次渲染重建，纳入依赖会导致退避定时器被反复重置
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

  useEffect(() => {
    const releaseHeldInputs = () => browserRemoteSession.current?.releaseAllInputs();
    const onVisibilityChange = () => {
      if (document.hidden) releaseHeldInputs();
    };
    // 切换到其它应用/标签页（Alt+Tab、Win+D 等系统快捷键会抢走焦点）时，抬起所有按住的键鼠。
    window.addEventListener("blur", releaseHeldInputs);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", releaseHeldInputs);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const stage = remoteStageRef.current;
    if (!stage || !inputControlActive) return;
    // React 的 onWheel 是被动监听，event.preventDefault() 无效，会导致整页跟随滚动；
    // 用原生非被动监听把滚动锁在画面内（仅在已解锁输入时）。
    // 注意：顶部从 react 导入了 WheelEvent 类型，会遮蔽 DOM 的同名类型；这里用 Event 即可。
    const lockPageScroll = (event: Event) => event.preventDefault();
    stage.addEventListener("wheel", lockPageScroll, { passive: false });
    return () => stage.removeEventListener("wheel", lockPageScroll);
  }, [inputControlActive]);

  const loginPageProps = {
    authJson,
    regionCode,
    mobile,
    smsCode,
    loginNotice,
    codeSent,
    smsCountdown,
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
    devicesLoaded,
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
    remoteStageFrameRef,
    isFullscreen,
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
    onRemoteStageBlur: handleRemoteStageBlur,
    onRemoteStagePaste: handleRemoteStagePaste,
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
