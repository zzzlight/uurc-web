import { useCallback, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type FloatingPanelPosition = {
  left: number;
  top: number;
};

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useDraggableFloatingPanel<T extends HTMLElement>() {
  const panelRef = useRef<T | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);

  const panelStyle = useMemo<CSSProperties | undefined>(() => {
    if (!position) return undefined;
    return {
      left: `${position.left}px`,
      top: `${position.top}px`,
      transform: "none",
    };
  }, [position]);

  const moveToPointer = useCallback((clientX: number, clientY: number) => {
    const panel = panelRef.current;
    const dragState = dragStateRef.current;
    const parent = panel?.parentElement;
    if (!panel || !dragState || !parent) return;

    const parentRect = parent.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const minLeft = 8;
    const minTop = 8;
    const maxLeft = Math.max(minLeft, parentRect.width - panelRect.width - 8);
    const maxTop = Math.max(minTop, parentRect.height - panelRect.height - 8);

    setPosition({
      left: clamp(clientX - parentRect.left - dragState.offsetX, minLeft, maxLeft),
      top: clamp(clientY - parentRect.top - dragState.offsetY, minTop, maxTop),
    });
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const panel = panelRef.current;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
    };
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic pointer events used by tests do not always create an active pointer.
    }
    event.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (dragStateRef.current?.pointerId !== event.pointerId) return;
      moveToPointer(event.clientX, event.clientY);
      event.preventDefault();
    },
    [moveToPointer],
  );

  const finishDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // The pointer may already be released by the browser or a test harness.
    }
    event.preventDefault();
  }, []);

  return {
    panelRef,
    panelStyle,
    dragHandleProps: {
      onPointerCancel: finishDrag,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishDrag,
    },
  };
}
