import { useEffect, useRef } from "react";
import { ChevronDown, Keyboard } from "lucide-react";

import { REMOTE_SHORTCUT_GROUPS, type RemoteShortcut } from "../remote/remoteShortcuts.js";

interface RemoteShortcutMenuProps {
  disabled: boolean;
  onRemoteShortcut: (shortcut: RemoteShortcut) => void;
}

export function RemoteShortcutMenu({ disabled, onRemoteShortcut }: RemoteShortcutMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    // 展开后点击菜单外部或按 Esc 自动收起。
    const onPointerDown = (event: Event) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.open) details.open = false;
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details className="shortcut-menu" ref={detailsRef}>
      <summary>
        <Keyboard size={17} />
        快捷键
        <ChevronDown className="shortcut-menu-chevron" size={15} />
      </summary>
      <div className="shortcut-menu-panel" role="menu" aria-label="远控快捷键">
        {REMOTE_SHORTCUT_GROUPS.map((group) => (
          <section className="shortcut-menu-group" key={group.title} aria-label={group.title}>
            <h3>{group.title}</h3>
            <div className="shortcut-menu-grid">
              {group.shortcuts.map((shortcut) => (
                <button
                  type="button"
                  key={shortcut.id}
                  disabled={disabled}
                  onClick={() => onRemoteShortcut(shortcut.id)}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
