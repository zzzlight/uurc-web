import {
  AlertTriangle,
  CircleStop,
  GripHorizontal,
  LoaderCircle,
  Maximize2,
  PlugZap,
  RotateCcw,
  Scan,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";
import { RemoteShortcutMenu } from "./RemoteShortcutMenu.js";
import { useDraggableFloatingPanel } from "./useDraggableFloatingPanel.js";

export function RemoteCommandBar({
  browserRemoteState,
  busy,
  canReconnectRemote,
  canSendRemoteText,
  controlChannelState,
  inputControlActive,
  isFullscreen,
  nextAction,
  onNextAction,
  onReconnectRemote,
  onRemoteShortcut,
  onRemoteTextInputChange,
  onSendRemoteText,
  onStageViewModeChange,
  onToggleInputControl,
  onToggleFullscreen,
  remoteRecoveryLabel,
  remoteStageViewMode,
  remoteTextInput,
  textChannelState,
}: Pick<
  RemoteControlPageProps,
  | "browserRemoteState"
  | "busy"
  | "canReconnectRemote"
  | "canSendRemoteText"
  | "controlChannelState"
  | "inputControlActive"
  | "isFullscreen"
  | "nextAction"
  | "onNextAction"
  | "onReconnectRemote"
  | "onRemoteShortcut"
  | "onRemoteTextInputChange"
  | "onSendRemoteText"
  | "onStageViewModeChange"
  | "onToggleInputControl"
  | "onToggleFullscreen"
  | "remoteRecoveryLabel"
  | "remoteStageViewMode"
  | "remoteTextInput"
  | "textChannelState"
>) {
  const nextStageMode = remoteStageViewMode === "fit" ? "fill" : "fit";
  const { dragHandleProps, panelRef, panelStyle } = useDraggableFloatingPanel<HTMLElement>();

  return (
    <section ref={panelRef} className="control-command-bar" style={panelStyle} aria-label="远控主流程">
      <button className="command-drag-handle" type="button" aria-label="拖动工具栏" {...dragHandleProps}>
        <GripHorizontal size={17} />
      </button>
      {remoteRecoveryLabel ? (
        <div className="connection-recovery-strip" role="status">
          <AlertTriangle size={16} />
          <span>{remoteRecoveryLabel}</span>
          <button onClick={onReconnectRemote} disabled={!canReconnectRemote || busy !== null}>
            <RotateCcw size={16} />
            立即重连
          </button>
        </div>
      ) : null}
      <div className="command-action-group command-action-primary">
        <button className="primary-action-button" onClick={onNextAction} disabled={nextAction.disabled}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <PlugZap size={17} />}
          {nextAction.label}
        </button>
        <button onClick={onToggleInputControl} disabled={controlChannelState !== "open"}>
          {inputControlActive ? <CircleStop size={17} /> : <ShieldCheck size={17} />}
          {inputControlActive ? "锁定输入控制" : "启用输入控制"}
        </button>
      </div>
      {nextAction.detail ? (
        <p className="operation-note" style={{ margin: "4px 2px 0", fontSize: "12px", opacity: 0.72 }}>
          {nextAction.detail}
        </p>
      ) : null}
      <div className="command-action-group command-action-tools" aria-label="远控工具栏">
        <button onClick={() => onStageViewModeChange(nextStageMode)}>
          <Scan size={17} />
          {remoteStageViewMode === "fit" ? "填充画面" : "适应画面"}
        </button>
        <button onClick={onToggleFullscreen}>
          <Maximize2 size={17} />
          {isFullscreen ? "退出全屏" : "全屏"}
        </button>
        <RemoteShortcutMenu disabled={!inputControlActive} onRemoteShortcut={onRemoteShortcut} />
      </div>
      {browserRemoteState.stage === "connected" || textChannelState === "open" ? (
        <div className="remote-input-row compact">
          <input
            id="remote-text-input"
            name="remoteTextInput"
            aria-label="远控文本输入"
            value={remoteTextInput}
            onChange={(event) => onRemoteTextInputChange(event.target.value)}
            placeholder="发送文本到被控端"
          />
          <button onClick={onSendRemoteText} disabled={!canSendRemoteText}>
            <TerminalSquare size={17} />
            发送文本
          </button>
        </div>
      ) : null}
    </section>
  );
}
