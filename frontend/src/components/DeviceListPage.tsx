import {
  Download,
  KeyRound,
  LoaderCircle,
  LogOut,
  Monitor,
  RefreshCw,
  TerminalSquare,
} from "lucide-react";

import type { AuthStatus, UuDeviceGroups } from "@uurc/shared/types";

import { DeviceSection } from "./DeviceControls.js";
import { IconButton, Panel, StatusRow } from "./Panel.js";
import { StatusPill } from "./StatusPill.js";

export function DeviceListPage({
  authStatus,
  authJson,
  devices,
  selectedDeviceId,
  identitySourceLabel,
  identityDeviceLabel,
  error,
  busy,
  onLoadStatus,
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
  onLoadStatus: () => void;
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
        <div className="topbar-actions">
          <StatusPill state="ready">已登录</StatusPill>
          <button className="toolbar-button" onClick={onLoadDevices} disabled={busy !== null}>
            {busy === "devices" ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />}
            刷新设备
          </button>
        </div>
      </header>

      {error ? (
        <section className="error-strip">
          <TerminalSquare size={18} />
          <span>{error}</span>
        </section>
      ) : null}

      <section className="device-home">
        <div className="device-home-main">
          <Panel
            className="devices-panel device-list-panel"
            title="设备"
            icon={<Monitor size={18} />}
          >
            <DeviceSection title="桌面端" devices={devices.desktopDevices} selected={selectedDeviceId} currentDeviceId={authStatus?.deviceId} onSelect={onSelectDevice} onConnect={onOpenDevice} />
            <DeviceSection title="移动端" devices={devices.mobileDevices} selected={selectedDeviceId} currentDeviceId={authStatus?.deviceId} onSelect={onSelectDevice} onConnect={onOpenDevice} />
            <DeviceSection title="TV" devices={devices.tvDevices} selected={selectedDeviceId} currentDeviceId={authStatus?.deviceId} onSelect={onSelectDevice} onConnect={onOpenDevice} />
          </Panel>
        </div>

        <aside className="account-drawer" aria-label="账号管理">
          <Panel
            className="account-panel"
            title="账号管理"
            icon={<KeyRound size={18} />}
            action={
              <IconButton label="刷新状态" busy={busy === "status"} onClick={onLoadStatus}>
                <RefreshCw size={17} />
              </IconButton>
            }
          >
            <section className="identity-summary" aria-label="账号状态">
              <div>
                <span>身份</span>
                <strong>{identitySourceLabel}</strong>
              </div>
              <div>
                <span>状态</span>
                <strong>已登录</strong>
              </div>
              <div>
                <span>本机控制端</span>
                <strong>{identityDeviceLabel}</strong>
              </div>
            </section>
            <div className="button-row account-actions">
              <button onClick={onExport} disabled={busy !== null}>
                {busy === "export" ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}
                导出登录态
              </button>
              <button className="secondary-button" onClick={onLogout} disabled={busy !== null}>
                {busy === "logout" ? <LoaderCircle className="spin" size={17} /> : <LogOut size={17} />}
                退出登录
              </button>
            </div>
            {authJson.trim() ? (
              <details className="identity-details export-details">
                <summary>登录态备份</summary>
                <label className="field-label" htmlFor="auth-json-export">
                  登录态 JSON
                </label>
                <textarea id="auth-json-export" name="auth-json-export" value={authJson} readOnly spellCheck={false} />
              </details>
            ) : null}
            <details className="identity-details">
              <summary>账号详情</summary>
              <div className="status-list compact">
                <StatusRow label="用户" value={authStatus?.userId ?? "-"} />
                <StatusRow label="客户端" value={authStatus?.clientId ?? "-"} />
                <StatusRow label="网页设备" value={authStatus?.deviceId ?? "-"} />
                <StatusRow label="渠道" value={authStatus?.channel ?? "-"} />
                <StatusRow label="Token 到期" value={authStatus?.tokenExpiresAt ?? "-"} />
              </div>
            </details>
          </Panel>
        </aside>
      </section>
    </main>
  );
}
