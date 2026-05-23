import { CircleStop, LoaderCircle, PlugZap, ShieldCheck, TerminalSquare } from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";

export function RemoteCommandBar({
  browserRemoteState,
  busy,
  canSendRemoteText,
  controlChannelState,
  inputControlActive,
  nextAction,
  onNextAction,
  onRemoteTextInputChange,
  onSendRemoteText,
  onToggleInputControl,
  remoteTextInput,
  textChannelState,
}: Pick<
  RemoteControlPageProps,
  | "browserRemoteState"
  | "busy"
  | "canSendRemoteText"
  | "controlChannelState"
  | "inputControlActive"
  | "nextAction"
  | "onNextAction"
  | "onRemoteTextInputChange"
  | "onSendRemoteText"
  | "onToggleInputControl"
  | "remoteTextInput"
  | "textChannelState"
>) {
  return (
    <section className="control-command-bar" aria-label="远控主流程">
      <button className="primary-action-button" onClick={onNextAction} disabled={nextAction.disabled}>
        {busy ? <LoaderCircle className="spin" size={17} /> : <PlugZap size={17} />}
        {nextAction.label}
      </button>
      <button onClick={onToggleInputControl} disabled={controlChannelState !== "open"}>
        {inputControlActive ? <CircleStop size={17} /> : <ShieldCheck size={17} />}
        {inputControlActive ? "锁定输入控制" : "启用输入控制"}
      </button>
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
