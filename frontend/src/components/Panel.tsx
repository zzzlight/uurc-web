import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <div>
          {icon}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

export function IconButton({ label, busy, onClick, children }: { label: string; busy: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className="icon-button" title={label} aria-label={label} onClick={onClick} disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={17} /> : children}
    </button>
  );
}
