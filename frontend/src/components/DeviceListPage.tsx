import { TerminalSquare } from "lucide-react";

import type { AuthStatus, UuDeviceGroups } from "@uurc/shared/types";

import { DeviceAccountPanel } from "./DeviceAccountPanel.js";
import { DeviceCatalogPanel } from "./DeviceCatalogPanel.js";

export function DeviceListPage({
  authStatus,
  authJson,
  devices,
  selectedDeviceId,
  identitySourceLabel,
  identityDeviceLabel,
  error,
  busy,
  onLoadDevices,
  onSelectDevice,
  onOpenDevice,
  onExport,
  onLogout,
}: {
  authStatus: AuthStatus | null;
  authJson: string;
  devices: UuDeviceGroups;
  selectedDeviceId: string;
  identitySourceLabel: string;
  identityDeviceLabel: string;
  error: string;
  busy: string | null;
  onLoadDevices: () => void;
  onSelectDevice: (deviceId: string) => void;
  onOpenDevice: (deviceId: string) => void;
  onExport: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="product-shell">
      <header className="product-topbar">
        <div className="brand-block">
          <span className="wordmark">UU Remote<span className="wordmark-sub">Web</span></span>
          <h1>我的设备</h1>
        </div>
      </header>

      {error ? (
        <section className="error-strip">
          <TerminalSquare size={18} />
          <span>{error}</span>
        </section>
      ) : null}

      <section className="device-home">
        <DeviceCatalogPanel
          authStatus={authStatus}
          devices={devices}
          busy={busy}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={onSelectDevice}
          onOpenDevice={onOpenDevice}
          onLoadDevices={onLoadDevices}
        />

        <aside className="account-drawer" aria-label="账号管理">
          <DeviceAccountPanel
            authJson={authJson}
            authStatus={authStatus}
            busy={busy}
            identityDeviceLabel={identityDeviceLabel}
            identitySourceLabel={identitySourceLabel}
            onExport={onExport}
            onLogout={onLogout}
          />
        </aside>
      </section>
    </main>
  );
}
