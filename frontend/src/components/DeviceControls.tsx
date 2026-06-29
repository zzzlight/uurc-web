import { ChevronRight } from "lucide-react";

import type { UuDevice } from "@uurc/shared/types";

import { getDeviceConnectionLabel, getDeviceControlLabel } from "../devices/deviceLabels.js";

export function DeviceSection({
  title,
  devices,
  loading,
  selected,
  currentDeviceId,
  onSelect,
  onConnect,
}: {
  title: string;
  devices: UuDevice[];
  loading?: boolean;
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
                {canConnect ? (
                  <span className="device-connect-link">
                    连接
                    <ChevronRight size={14} />
                  </span>
                ) : null}
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
        <p className="empty-text">{loading ? "正在加载设备…" : "该类别暂无设备"}</p>
      )}
    </section>
  );
}
