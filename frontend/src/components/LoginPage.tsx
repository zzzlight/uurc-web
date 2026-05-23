import { TerminalSquare } from "lucide-react";

import { LoginForm } from "./LoginForm.js";
import { LoginImportPanel } from "./LoginImportPanel.js";
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
          <LoginForm
            busy={busy}
            canLogin={canLogin}
            canSubmitMobile={canSubmitMobile}
            codeRequested={codeRequested}
            loginNotice={loginNotice}
            mobile={mobile}
            regionCode={regionCode}
            smsCode={smsCode}
            onMobileChange={onMobileChange}
            onMobileLogin={onMobileLogin}
            onRegionCodeChange={onRegionCodeChange}
            onSendMobileCode={onSendMobileCode}
            onSmsCodeChange={onSmsCodeChange}
          />
          <LoginImportPanel
            authJson={authJson}
            busy={busy}
            onAuthJsonChange={onAuthJsonChange}
            onImport={onImport}
          />
        </div>
      </section>
    </main>
  );
}
