"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastVariant = "default" | "error";

type ToastOptions = {
  action?: { label: string; onClick: () => void };
  duration?: number;
  variant?: ToastVariant;
};

type ToastContextValue = {
  show: (message: string, opts?: ToastOptions) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

type ToastState = {
  message: string;
  action?: { label: string; onClick: () => void };
  variant: ToastVariant;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
    hideTimerRef.current = setTimeout(() => setToast(null), 200);
  }, []);

  const show = useCallback(
    (message: string, opts?: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      setToast({
        message,
        action: opts?.action,
        variant: opts?.variant ?? "default",
      });
      setVisible(true);

      const duration = opts?.duration ?? 4000;
      timerRef.current = setTimeout(() => dismiss(), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="pointer-events-none">
        {toast && (
          <div
            className={`fixed left-4 right-4 z-50 pointer-events-auto flex items-center justify-between rounded-xl px-4 py-3 shadow-lg transition-all duration-200 motion-reduce:transition-none bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            } ${
              toast.variant === "error"
                ? "bg-destructive text-destructive-foreground"
                : "bg-foreground text-background"
            }`}
          >
            <span className="text-sm">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss();
                }}
                className="text-sm font-semibold ml-4 shrink-0"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
