"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    previousFocusRef.current = document.activeElement;

    const panel = panelRef.current;
    if (!panel) return;

    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    if (first) {
      first.focus();
    } else {
      panel.tabIndex = -1;
      panel.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(panel!.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    panel.addEventListener("keydown", onKeyDown);
    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      const prev = previousFocusRef.current;
      if (prev && "focus" in prev) (prev as HTMLElement).focus();
    };
  }, [active]);

  return panelRef;
}
