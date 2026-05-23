import { Download, KeyRound, LoaderCircle, LogOut } from "lucide-react";

import type { AuthStatus } from "@uurc/shared/types";

import { Panel, StatusRow } from "./Panel.js";
import { StatusPill } from "./StatusPill.js";

export function DeviceAccountPanel({
  authJson,
  authStatus,
  busy,
  identityDeviceLabel,
  identitySourceLabel,
  onExport,
  onLogout,
}: {
  authJson: string;
  authStatus: AuthStatus | null;
  busy: string | null;
  identityDeviceLabel: string;
  identitySourceLabel: string;
  onExport: () => void;
  onLogout: () => void;
}) {
  return (
    <Panel
      className="account-panel"
      title="账号管理"
      titleAccessory={<StatusPill state="ready">已登录</StatusPill>}
      icon={<KeyRound size={18} />}
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
  );
}
