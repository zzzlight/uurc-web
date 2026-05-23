import { ClipboardCheck, LoaderCircle } from "lucide-react";

export function LoginImportPanel({
  authJson,
  busy,
  onAuthJsonChange,
  onImport,
}: {
  authJson: string;
  busy: string | null;
  onAuthJsonChange: (value: string) => void;
  onImport: () => void;
}) {
  return (
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
  );
}
