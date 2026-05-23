import { LoaderCircle, Monitor, RefreshCw } from "lucide-react";

import type { AuthStatus, UuDeviceGroups } from "@uurc/shared/types";

import { DeviceSection } from "./DeviceControls.js";
import { Panel } from "./Panel.js";

export function DeviceCatalogPanel({
  authStatus,
  busy,
  devices,
  selectedDeviceId,
  onLoadDevices,
  onOpenDevice,
  onSelectDevice,
}: {
  authStatus: AuthStatus | null;
  busy: string | null;
  devices: UuDeviceGroups;
  selectedDeviceId: string;
  onLoadDevices: () => void;
  onOpenDevice: (deviceId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}) {
  return (
    <Panel
      className="devices-panel device-list-panel"
      title="设备"
      icon={<Monitor size={18} />}
      action={
        <button className="toolbar-button" onClick={onLoadDevices} disabled={busy !== null}>
          {busy === "devices" ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}
          刷新设备
        </button>
      }
    >
      <DeviceSection title="桌面端" devices={devices.desktopDevices} selected={selectedDeviceId} currentDeviceId={authStatus?.deviceId} onSelect={onSelectDevice} onConnect={onOpenDevice} />
      <DeviceSection title="移动端" devices={devices.mobileDevices} selected={selectedDeviceId} currentDeviceId={authStatus?.deviceId} onSelect={onSelectDevice} onConnect={onOpenDevice} />
      <DeviceSection title="TV" devices={devices.tvDevices} selected={selectedDeviceId} currentDeviceId={authStatus?.deviceId} onSelect={onSelectDevice} onConnect={onOpenDevice} />
    </Panel>
  );
}
