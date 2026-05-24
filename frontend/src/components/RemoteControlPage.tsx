import { TerminalSquare } from "lucide-react";

import type { RemoteControlPageProps } from "../app/remoteControlPageProps.js";
import { RemoteCommandBar } from "./RemoteCommandBar.js";
import { RemoteControlDiagnosticsDrawer } from "./RemoteControlDiagnosticsDrawer.js";
import { RemoteControlInsights } from "./RemoteControlInsights.js";
import { RemoteControlSettingsDrawer } from "./RemoteControlSettingsDrawer.js";
import { RemoteControlStage } from "./RemoteControlStage.js";
import { RemoteControlTopbar } from "./RemoteControlTopbar.js";
import { RemoteControlWarnings } from "./RemoteControlWarnings.js";

export function RemoteControlPage(props: RemoteControlPageProps) {
  return (
    <main className="control-shell">
      <RemoteControlTopbar {...props} />

      {props.error ? (
        <section className="error-strip">
          <TerminalSquare size={18} />
          <span>{props.error}</span>
        </section>
      ) : null}

      <section className="control-stage-layout">
        <div className="control-stage-frame">
          <RemoteCommandBar {...props} />
          <RemoteControlStage {...props} />
        </div>
        <RemoteControlWarnings {...props} />
        <RemoteControlInsights {...props} />
        <div className="control-drawer-row">
          <RemoteControlSettingsDrawer {...props} />
          <RemoteControlDiagnosticsDrawer {...props} />
        </div>
      </section>
    </main>
  );
}
