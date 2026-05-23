import type { KeyboardEvent, PointerEvent, RefObject, WheelEvent } from "react";

import {
  CircleStop,
  LoaderCircle,
  Monitor,
  PlugZap,
  ShieldCheck,
  TerminalSquare,
  TriangleAlert,
} from "lucide-react";
import type {
  RemoteControlBootstrap,
  RemoteSignalGatewayEvent,
  RemoteSignalReadinessDiagnostics,
  UuDevice,
  UuParticipantInfo,
} from "@uurc/shared/types";

import type {
  BusyAction,
  ConnectionRouteMode,
  NextAction,
  RemoteVideoStream,
  SdpTransportMode,
} from "../app/remoteControlTypes.js";
import type {
  BrowserRemoteSessionState,
  BrowserRemoteVideoElementSample,
} from "../remote/browserRemoteSession.js";
import { DebugEventList } from "./DebugEventList.js";
import { formatAppFlagControlMode, getDeviceConnectionLabel, ParticipantList } from "./DeviceControls.js";
import { StatusRow } from "./Panel.js";
import { ReadinessStrip } from "./ReadinessStrip.js";
import { RemoteVideoTile } from "./RemoteVideoTile.js";
import { StatusPill } from "./StatusPill.js";

export interface RemoteControlPageProps {
  autoSwitchThresholdLabel: string;
  browserIceServers: number;
  browserRemoteState: BrowserRemoteSessionState;
  browserRtcDescription: string;
  browserRtcReady: boolean;
  browserStageLabel: string;
  busy: BusyAction;
  canDisconnectRemote: boolean;
  canSendRemoteText: boolean;
  candidatePairSummary: string;
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
  remoteStageRef: RefObject<HTMLDivElement | null>;
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
  onForceJoinChange: (forceJoin: boolean) => void;
  onNextAction: () => void;
  onRemoteStageKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onRemoteStageKeyUp: (event: KeyboardEvent<HTMLDivElement>) => void;
  onRemoteStagePointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStagePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStagePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStagePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onRemoteStageWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onRemoteTextInputChange: (value: string) => void;
  onRemoteVideoSample: (videoId: string, sample: BrowserRemoteVideoElementSample) => void;
  onReturnToDevices: () => void;
  onSdpTransportModeChange: (mode: SdpTransportMode) => void;
  onSendRemoteText: () => void;
  onSignalServerIndexChange: (index: number) => void;
  onStartBrowserRemote: () => void;
  onStartSignalGateway: () => void;
  onStopSignalGateway: () => void;
  onSyncSignalEvents: () => void;
  onToggleInputControl: () => void;
}

export function RemoteControlPage(props: RemoteControlPageProps) {
  return (
    <main className="control-shell">
      <header className="control-topbar">
        <button className="secondary-button" onClick={props.onReturnToDevices} disabled={props.busy !== null}>
          返回设备列表
        </button>
        <div>
          <h1>{props.selectedDevice?.alias ?? "远控画面"}</h1>
        </div>
        <div className="topbar-actions">
          <StatusPill state={props.browserRemoteState.stage === "connected" ? "ready" : "idle"}>
            {props.browserRemoteState.stage === "connected" ? "控制中" : props.signalGatewayDisplay}
          </StatusPill>
          {props.canDisconnectRemote ? (
            <button className="danger-button" onClick={props.onStopSignalGateway} disabled={props.busy !== null}>
              {props.busy === "signal-stop" ? <LoaderCircle className="spin" size={17} /> : <CircleStop size={17} />}
              断开连接
            </button>
          ) : null}
        </div>
      </header>

      {props.error ? (
        <section className="error-strip">
          <TerminalSquare size={18} />
          <span>{props.error}</span>
        </section>
      ) : null}

      <section className="control-stage-layout">
        <div
          ref={props.remoteStageRef}
          className={`remote-stage control-remote-stage ${props.inputControlActive ? "remote-stage-interactive" : ""}`}
          role="application"
          aria-label="远控画面"
          tabIndex={0}
          onPointerDown={props.onRemoteStagePointerDown}
          onPointerMove={props.onRemoteStagePointerMove}
          onPointerUp={props.onRemoteStagePointerUp}
          onPointerCancel={props.onRemoteStagePointerCancel}
          onWheel={props.onRemoteStageWheel}
          onKeyDown={props.onRemoteStageKeyDown}
          onKeyUp={props.onRemoteStageKeyUp}
        >
          {props.hasRemoteVideo ? (
            <>
              <div className="remote-video-grid">
                {props.remoteVideoStreams.map((video, index) => (
                  <RemoteVideoTile
                    key={video.id}
                    videoId={video.id}
                    index={index}
                    visible={video.id === props.primaryRemoteVideoId}
                    stream={video.stream}
                    onVideoSample={props.onRemoteVideoSample}
                  />
                ))}
              </div>
              <div className="stage-badge">
                {props.browserRemoteState.stage} · {props.remoteVideoCount} 路视频 · {props.videoFlowLabel} · 输入{props.inputControlLabel}
              </div>
            </>
          ) : (
            <>
              <div className="stage-grid" />
              <div className="stage-center">
                <Monitor size={34} />
                <strong>{props.selectedDevice?.alias ?? "未选择设备"}</strong>
                <span>
                  {props.browserRemoteState.remoteTrackCount > 0
                    ? "正在加载画面"
                    : props.remoteBootstrap || props.roomResponseReady
                      ? "已就绪"
                      : "未连接"}
                </span>
              </div>
            </>
          )}
        </div>

        <section className="control-command-bar" aria-label="远控主流程">
          <button className="primary-action-button" onClick={props.onNextAction} disabled={props.nextAction.disabled}>
            {props.busy ? <LoaderCircle className="spin" size={17} /> : <PlugZap size={17} />}
            {props.nextAction.label}
          </button>
          <button onClick={props.onToggleInputControl} disabled={props.controlChannelState !== "open"}>
            {props.inputControlActive ? <CircleStop size={17} /> : <ShieldCheck size={17} />}
            {props.inputControlActive ? "锁定输入控制" : "启用输入控制"}
          </button>
          {props.browserRemoteState.stage === "connected" || props.textChannelState === "open" ? (
            <div className="remote-input-row compact">
              <input
                id="remote-text-input"
                name="remoteTextInput"
                aria-label="远控文本输入"
                value={props.remoteTextInput}
                onChange={(event) => props.onRemoteTextInputChange(event.target.value)}
                placeholder="发送文本到被控端"
              />
              <button onClick={props.onSendRemoteText} disabled={!props.canSendRemoteText}>
                <TerminalSquare size={17} />
                发送文本
              </button>
            </div>
          ) : null}
        </section>

        <ControlWarnings {...props} />
        <ControlDrawers {...props} />
      </section>
    </main>
  );
}

function ControlWarnings({
  forceJoin,
  normalJoinTakeoverHint,
  roomJoinFailureMessage,
  roomJoinFailureTakeoverHint,
  roomRequiresTakeover,
  selectedDeviceOccupied,
  selfDeviceBlockedReason,
  signalGatewayErrorHint,
}: RemoteControlPageProps) {
  return (
    <>
      {selectedDeviceOccupied && !forceJoin ? (
        <div className="occupancy-callout">
          <TriangleAlert size={17} />
          <span>已有控制端在线</span>
        </div>
      ) : null}
      {roomRequiresTakeover ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>选择接管后重试</span>
        </div>
      ) : null}
      {roomJoinFailureMessage ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{roomJoinFailureMessage}</span>
        </div>
      ) : null}
      {selfDeviceBlockedReason ? (
        <div className="occupancy-callout">
          <TriangleAlert size={17} />
          <span>{selfDeviceBlockedReason}</span>
        </div>
      ) : null}
      {roomJoinFailureTakeoverHint ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{roomJoinFailureTakeoverHint}</span>
        </div>
      ) : null}
      {normalJoinTakeoverHint ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{normalJoinTakeoverHint}</span>
        </div>
      ) : null}
      {signalGatewayErrorHint ? (
        <div className="occupancy-callout takeover">
          <TriangleAlert size={17} />
          <span>{signalGatewayErrorHint}</span>
        </div>
      ) : null}
    </>
  );
}

function ControlDrawers(props: RemoteControlPageProps) {
  return (
    <div className="control-drawer-row">
      <details className="control-drawer">
        <summary>控制设置</summary>
        {props.selectedDevice ? <ParticipantList participants={props.selectedParticipants} /> : null}
        {props.selectedDevice ? (
          <fieldset className="join-mode-control" aria-label="加入模式">
            <legend>加入模式</legend>
            <label>
              <input type="radio" name="joinMode" checked={!props.forceJoin} onChange={() => props.onForceJoinChange(false)} />
              <span>普通加入</span>
            </label>
            <label>
              <input type="radio" name="joinMode" checked={props.forceJoin} onChange={() => props.onForceJoinChange(true)} />
              <span>接管控制</span>
            </label>
          </fieldset>
        ) : null}
        <div className="transport-actions">
          <button onClick={props.onStartSignalGateway} disabled={props.busy !== null}>
            {props.busy === "signal-start" ? <LoaderCircle className="spin" size={17} /> : <PlugZap size={17} />}
            手动启动连接服务
          </button>
          <button onClick={props.onStopSignalGateway} disabled={props.busy !== null}>
            {props.busy === "signal-stop" ? <LoaderCircle className="spin" size={17} /> : <CircleStop size={17} />}
            手动断开连接
          </button>
          <button onClick={props.onStartBrowserRemote} disabled={!props.browserRtcReady}>
            {props.busy === "browser-remote-start" ? <LoaderCircle className="spin" size={17} /> : <Monitor size={17} />}
            手动启动画面
          </button>
        </div>
        {props.signalServerOptions.length > 0 ? (
          <label className="select-field" htmlFor="signal-server-index">
            <span>信令入口</span>
            <select
              id="signal-server-index"
              aria-label="信令入口"
              value={props.signalServerIndex}
              onChange={(event) => props.onSignalServerIndexChange(Number(event.target.value))}
            >
              {props.signalServerOptions.map((server, index) => (
                <option key={`${server}-${index}`} value={index}>
                  {server}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <fieldset className="segmented-control" aria-label="画面协商">
          <legend>画面兼容性</legend>
          <label>
            <input type="radio" name="sdpTransportMode" checked={props.sdpTransportMode === "gzip"} onChange={() => props.onSdpTransportModeChange("gzip")} />
            <span>标准模式</span>
          </label>
          <label>
            <input type="radio" name="sdpTransportMode" checked={props.sdpTransportMode === "plain"} onChange={() => props.onSdpTransportModeChange("plain")} />
            <span>兼容模式</span>
          </label>
        </fieldset>
        <fieldset className="segmented-control" aria-label="网络路径">
          <legend>网络路径</legend>
          <label>
            <input type="radio" name="connectionRouteMode" checked={props.connectionRouteMode === "auto"} onChange={() => props.onConnectionRouteModeChange("auto")} />
            <span>自动路径</span>
          </label>
          <label>
            <input type="radio" name="connectionRouteMode" checked={props.connectionRouteMode === "relay"} onChange={() => props.onConnectionRouteModeChange("relay")} />
            <span>强制 UU 中转</span>
          </label>
        </fieldset>
      </details>

      <details className="control-drawer">
        <summary>调试信息</summary>
        <div className="transport-actions">
          <button onClick={props.onSyncSignalEvents} disabled={props.busy !== null}>
            {props.busy === "signal-events" ? <LoaderCircle className="spin" size={17} /> : <TerminalSquare size={17} />}
            手动同步诊断
          </button>
        </div>
        <div className="status-list compact">
          <StatusRow label="目标设备" value={props.selectedDevice?.alias ?? "-"} />
          <StatusRow label="目标 ID" value={props.selectedDeviceId || "-"} />
          <StatusRow label="在线状态" value={props.selectedDevice ? getDeviceConnectionLabel(props.selectedDevice) : "-"} />
          <StatusRow label="控制模式" value={props.selectedDevice ? formatAppFlagControlMode(props.selectedDevice.appFlag) : "-"} />
          <StatusRow label="加入模式" value={props.joinModeLabel} />
          <StatusRow label="入会方式" value={props.roomJoinModeDebugLabel} />
          <StatusRow label="连接服务" value={props.signalGatewayDisplay} />
          <StatusRow label="信令状态" value={props.signalGatewayDisplay} />
          <StatusRow label="浏览器控制" value={props.browserRtcDescription} />
          <StatusRow label="实际路径" value={props.connectionPathLabel} />
          <StatusRow label="候选链路" value={props.candidatePairSummary} />
          <StatusRow label="链路策略" value={props.effectiveConnectionRouteLabel} />
          <StatusRow label="服务链路" value={props.serviceRoutePolicyLabel} />
          <StatusRow label="ICE" value={props.iceControlStatusLabel} />
          <StatusRow label="自动切换" value={props.autoSwitchThresholdLabel} />
          <StatusRow label="网络事件" value={props.networkSwitchSummary} />
          <StatusRow label="视频状态" value={props.videoFlowLabel} />
          <StatusRow label="视频接收" value={props.inboundVideoStatsLabel} />
          <StatusRow label="视频采样" value={props.videoElementLabel} />
          <StatusRow label="控制通道" value={props.controlChannelLabel} />
          <StatusRow label="文本通道" value={props.textChannelLabel} />
          <StatusRow label="输入控制" value={props.inputControlActive ? "输入控制已启用" : "输入控制锁定"} />
          <StatusRow label="房间释放" value={props.roomReleaseLabel} />
          <StatusRow label="释放详情" value={props.roomReleaseDetail} />
        </div>
        <ReadinessStrip diagnostics={props.signalReadiness} />
        <details className="protocol-details">
          <summary>协议细节</summary>
          <div className="status-list compact transport-details">
            <StatusRow label="Headers" value={props.signalHeaderSummary} />
            <StatusRow label="事件" value={props.remoteBootstrap ? props.remoteBootstrap.signalEvents.join(", ") : "-"} />
            <StatusRow label="事件日志" value={String(props.signalEvents.length)} />
            <StatusRow label="未知事件" value={props.unexpectedSignalEventSummary} />
            <StatusRow label="浏览器 WebRTC" value={`${props.browserStageLabel} / ICE ${props.browserIceServers}`} />
            <StatusRow label="SDP" value={props.sdpTransportLabel} />
            <StatusRow label="链路策略" value={props.effectiveConnectionRouteLabel} />
            <StatusRow label="Control ID" value={props.browserRemoteState.appControlId || "-"} />
          </div>
        </details>
        <details className="debug-details">
          <summary>脱敏调试摘要</summary>
          <pre className="response-box">{props.roomDebugPayload ? JSON.stringify(props.roomDebugPayload, null, 2) : "No room response yet."}</pre>
        </details>
        <details className="debug-events-details">
          <summary>远控调试日志</summary>
          <DebugEventList events={props.debugEvents} />
        </details>
      </details>
    </div>
  );
}
