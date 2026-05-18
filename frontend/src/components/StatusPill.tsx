import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";

interface StatusPillProps {
  state: "ready" | "warn" | "idle";
  children: React.ReactNode;
}

export function StatusPill({ state, children }: StatusPillProps) {
  const Icon = state === "ready" ? CheckCircle2 : state === "warn" ? CircleAlert : CircleDashed;
  return (
    <span className={`status-pill status-pill-${state}`}>
      <Icon size={15} />
      {children}
    </span>
  );
}
