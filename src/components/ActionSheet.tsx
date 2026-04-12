"use client";

import { useEffect, useState } from "react";

export interface ActionSheetAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
}

export default function ActionSheet({
  open,
  onClose,
  title,
  message,
  actions,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end p-3 gap-2"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Actions card */}
      <div
        className={`relative bg-background rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {(title || message) && (
          <div className="px-4 py-3 text-center border-b">
            {title && (
              <p className="text-sm font-semibold text-foreground">{title}</p>
            )}
            {message && (
              <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
            )}
          </div>
        )}
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className={`w-full px-4 py-4 text-center text-base font-medium active:bg-muted transition-colors ${
              i > 0 || title || message ? "border-t" : ""
            } ${action.destructive ? "text-destructive" : "text-foreground"}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Cancel — separate card, iOS-style */}
      <button
        onClick={onClose}
        className={`relative bg-background rounded-2xl w-full px-4 py-4 text-center text-base font-semibold active:bg-muted transition-colors shadow-2xl transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        Cancel
      </button>
    </div>
  );
}
