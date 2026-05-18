import { UsersRound } from "lucide-react";

import type { UuDevice } from "@uurc/shared/types";

export function DeviceSection({
  title,
  devices,
  selected,
  currentDeviceId,
  onSelect,
  onConnect,
}: {
  title: string;
  devices: UuDevice[];
  selected: string;
  currentDeviceId?: string;
  onSelect: (deviceId: string) => void;
  onConnect?: (deviceId: string) => void;
}) {
  return (
    <section className="device-section">
      <h3>{title}</h3>
      {devices.length ? (
        <div className="device-list">
          {devices.map((device) => {
            const canConnect = Boolean(onConnect && device.controllable && device.deviceId !== currentDeviceId);
            const className = [
              "device-item",
              canConnect ? "device-item-action" : "device-item-static",
              device.deviceId === selected ? "selected" : "",
            ].filter(Boolean).join(" ");
            const content = (
              <>
                <span className="device-name">{device.alias}</span>
                <span className="device-item-meta">
                  <small>{getDeviceConnectionLabel(device)}</small>
                  <small>{getDeviceControlLabel(device)}</small>
                  {device.deviceId === currentDeviceId ? <small>当前登录态</small> : null}
                </span>
                {canConnect ? <span className="device-connect-label">连接</span> : null}
              </>
            );

            return canConnect ? (
              <button
                className={className}
                key={`${title}-${device.deviceId}`}
                aria-label={`连接 ${device.alias}`}
                onClick={() => {
                  onSelect(device.deviceId);
                  onConnect?.(device.deviceId);
                }}
              >
                {content}
              </button>
            ) : (
              <div className={className} key={`${title}-${device.deviceId}`}>
                {content}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-text">尚未加载设备。</p>
      )}
    </section>
  );
}

export function ParticipantList({ participants }: { participants: NonNullable<UuDevice["participantsInfo"]> }) {
  if (!participants.length) {
    return (
      <div className="participant-empty">
        <UsersRound size={17} />
        <span>暂无控制端占用</span>
      </div>
    );
  }

  return (
    <div className="participant-list" aria-label="当前控制端">
      {participants.map((participant, index) => (
        <div className="participant-card" key={`${participant.clientId || participant.deviceId || "participant"}-${index}`}>
          <UsersRound size={17} />
          <div>
            <strong>{participant.alias || "未知控制端"}</strong>
            <span>{formatParticipantMeta(participant)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function getDeviceConnectionLabel(device: UuDevice): string {
  if (device.status === "CONNECTED") return "已连接";
  if (device.status) return device.status;
  return device.controllable ? "在线" : "待机";
}

export function getDeviceControlLabel(device: UuDevice): string {
  return (device.participantsInfo?.length ?? 0) > 0 ? "已有控制端" : device.controllable ? "可控制" : "不可控制";
}

export function formatAppFlagControlMode(appFlag: unknown): string {
  const record = asRecord(appFlag);
  if (!record) return "-";
  if (!("control_mode" in record) && !("controlMode" in record)) return "-";

  const rawMode = "control_mode" in record ? record.control_mode : record.controlMode;
  if (rawMode === null) return "普通桌面";
  if (rawMode === "second_screen") return "副屏";
  if (typeof rawMode === "string" && rawMode.length > 0) return rawMode;
  return "-";
}

function formatParticipantMeta(participant: NonNullable<UuDevice["participantsInfo"]>[number]): string {
  const parts = [formatPlatform(participant.platform)];
  if (participant.joinType !== undefined) parts.push(participant.joinType === 1 ? "主控" : `类型 ${participant.joinType}`);
  if (participant.controlledSeconds !== undefined && participant.controlledSeconds >= 0) parts.push(formatDuration(participant.controlledSeconds));
  const controlMode = formatAppFlagControlMode(participant.appFlag);
  if (controlMode !== "-") parts.push(`模式：${controlMode}`);
  return parts.filter(Boolean).join(" · ") || "控制端";
}

function formatPlatform(platform: number | undefined): string {
  if (platform === undefined) return "";
  const labels: Record<number, string> = {
    1: "Windows",
    2: "Android",
    3: "iOS",
    4: "macOS",
    5: "TV",
  };
  return labels[platform] ?? `平台 ${platform}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
