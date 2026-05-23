import {
  ClipboardCheck,
  LoaderCircle,
  LogIn,
  Send,
  TerminalSquare,
} from "lucide-react";

import { StatusPill } from "./StatusPill.js";

export function LoginPage({
  authJson,
  regionCode,
  mobile,
  smsCode,
  loginNotice,
  error,
  busy,
  canSubmitMobile,
  canLogin,
  onAuthJsonChange,
  onRegionCodeChange,
  onMobileChange,
  onSmsCodeChange,
  onSendMobileCode,
  onMobileLogin,
  onImport,
}: {
  authJson: string;
  regionCode: string;
  mobile: string;
  smsCode: string;
  loginNotice: string;
  error: string;
  busy: string | null;
  canSubmitMobile: boolean;
  canLogin: boolean;
  onAuthJsonChange: (value: string) => void;
  onRegionCodeChange: (value: string) => void;
  onMobileChange: (value: string) => void;
  onSmsCodeChange: (value: string) => void;
  onSendMobileCode: () => void;
  onMobileLogin: () => void;
  onImport: () => void;
}) {
  const codeRequested = Boolean(loginNotice || smsCode.trim());

  return (
    <main className="product-shell auth-product-shell">
      <header className="product-topbar">
        <div className="brand-block">
          <span className="wordmark">UU Remote<span className="wordmark-sub">Web</span></span>
        </div>
        <StatusPill state="warn">未登录</StatusPill>
      </header>

      {error ? (
        <section className="error-strip">
          <TerminalSquare size={18} />
          <span>{error}</span>
        </section>
      ) : null}

      <section className="login-layout">
        <div className="login-actions">
          <section className="form-section auth-card" aria-label="用手机号登录">
            <h2>登录</h2>
            <div className="inline-fields">
              <label htmlFor="region-code">
                <span>区号</span>
                <input
                  id="region-code"
                  name="regionCode"
                  aria-label="区号"
                  inputMode="numeric"
                  value={regionCode}
                  onChange={(event) => onRegionCodeChange(event.target.value)}
                  placeholder="86"
                />
              </label>
              <label htmlFor="mobile-number">
                <span>手机号</span>
                <input
                  id="mobile-number"
                  name="mobile"
                  aria-label="手机号"
                  inputMode="tel"
                  value={mobile}
                  onChange={(event) => onMobileChange(event.target.value)}
                  placeholder="13800000000"
                />
              </label>
            </div>
            {codeRequested ? (
              <label htmlFor="sms-code">
                <span>验证码</span>
                <input
                  id="sms-code"
                  name="smsCode"
                  aria-label="短信验证码"
                  inputMode="numeric"
                  value={smsCode}
                  onChange={(event) => onSmsCodeChange(event.target.value)}
                  placeholder="123456"
                />
              </label>
            ) : null}
            {codeRequested ? (
              <div className="login-button-row">
                <button className="primary-action-button" onClick={onMobileLogin} disabled={!canLogin}>
                  {busy === "mobile-login" ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}
                  登录
                </button>
                <button onClick={onSendMobileCode} disabled={!canSubmitMobile}>
                  {busy === "send-mobile-code" ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                  重新获取
                </button>
              </div>
            ) : (
              <button className="primary-action-button" onClick={onSendMobileCode} disabled={!canSubmitMobile}>
                {busy === "send-mobile-code" ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                获取验证码
              </button>
            )}
            {loginNotice ? <p className="operation-note">{loginNotice}</p> : null}
          </section>

          <details className="identity-section auth-card login-import" aria-label="导入已有登录态">
            <summary>导入登录态</summary>
            <label className="field-label" htmlFor="auth-json">
              登录态 JSON
            </label>
            <textarea
              id="auth-json"
              name="auth-json"
              value={authJson}
              onChange={(event) => onAuthJsonChange(event.target.value)}
              spellCheck={false}
              placeholder='{"token":"...","userId":"...","deviceId":"..."}'
            />
            <div className="button-row account-actions">
              <button onClick={onImport} disabled={!authJson.trim() || busy !== null}>
                {busy === "import" ? <LoaderCircle className="spin" size={17} /> : <ClipboardCheck size={17} />}
                导入登录态 JSON
              </button>
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
