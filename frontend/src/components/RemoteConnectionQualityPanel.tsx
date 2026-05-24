import { Activity, RotateCcw } from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";

export function RemoteConnectionQualityPanel({
  autoReconnectEnabled,
  autoReconnectLabel,
  connectionPathLabel,
  connectionQuality,
  controlChannelLabel,
  onAutoReconnectEnabledChange,
  textChannelLabel,
  videoFlowLabel,
}: Pick<
  RemoteControlPageProps,
  | "autoReconnectEnabled"
  | "autoReconnectLabel"
  | "connectionPathLabel"
  | "connectionQuality"
  | "controlChannelLabel"
  | "onAutoReconnectEnabledChange"
  | "textChannelLabel"
  | "videoFlowLabel"
>) {
  return (
    <section className={`control-insight-panel quality-${connectionQuality.state}`} aria-label="连接质量">
      <header>
        <div>
          <Activity size={17} />
          <h2>连接质量</h2>
        </div>
        <span>{connectionQuality.title}</span>
      </header>
      <p>{connectionQuality.detail}</p>
      <div className="quality-metrics" aria-label="连接质量指标">
        <span>路径 {connectionPathLabel}</span>
        <span>画面 {videoFlowLabel}</span>
        <span>控制 {controlChannelLabel}</span>
        <span>文本 {textChannelLabel}</span>
      </div>
      <label className="auto-reconnect-toggle">
        <input
          type="checkbox"
          checked={autoReconnectEnabled}
          onChange={(event) => onAutoReconnectEnabledChange(event.target.checked)}
        />
        <span>
          <RotateCcw size={15} />
          自动重连
        </span>
      </label>
      <small>{autoReconnectLabel}</small>
    </section>
  );
}
