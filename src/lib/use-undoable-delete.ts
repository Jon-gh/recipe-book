import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";

type Options<T> = {
  commit: (item: T) => Promise<void>;
  onRevert: () => void;
  delayMs?: number;
  undoLabel?: string;
};

type RemoveOptions = {
  optimisticHide: () => void;
  message: string;
};

export function useUndoableDelete<T>({
  commit,
  onRevert,
  delayMs = 6000,
  undoLabel = "Undo",
}: Options<T>) {
  const { show } = useToast();
  const pendingRef = useRef<{
    item: T;
    timerId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Commit on unmount if a deletion is still pending
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timerId);
        commit(pendingRef.current.item).catch(() => {});
        pendingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = useCallback(
    (item: T, { optimisticHide, message }: RemoveOptions) => {
      // Commit any prior pending item immediately before starting a new one
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timerId);
        const prev = pendingRef.current.item;
        pendingRef.current = null;
        commit(prev).catch(() => onRevert());
      }

      optimisticHide();

      const timerId = setTimeout(async () => {
        pendingRef.current = null;
        try {
          await commit(item);
        } catch {
          onRevert();
        }
      }, delayMs);

      pendingRef.current = { item, timerId };

      show(message, {
        duration: delayMs,
        action: {
          label: undoLabel,
          onClick: () => {
            if (!pendingRef.current) return;
            clearTimeout(pendingRef.current.timerId);
            pendingRef.current = null;
            onRevert();
          },
        },
      });
    },
    [commit, onRevert, delayMs, undoLabel, show]
  );

  return { remove };
}
