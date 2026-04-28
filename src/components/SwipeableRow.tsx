"use client";

import { useEffect, useRef, useState } from "react";

const REVEAL_WIDTH = 72;

interface Props {
  onEdit: () => void;
  children: React.ReactNode;
}

export default function SwipeableRow({ onEdit, children }: Props) {
  const [offset, setOffset] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const gestureBaseRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const trackingRef = useRef<"none" | "h" | "v">("none");
  const animatingRef = useRef(false);

  function snap(to: number) {
    animatingRef.current = true;
    offsetRef.current = to;
    setOffset(to);
  }

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    function onMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startXRef.current;
      const dy = e.touches[0].clientY - startYRef.current;

      if (trackingRef.current === "none") {
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          trackingRef.current = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
        }
      }

      if (trackingRef.current !== "h") return;
      e.preventDefault();
      animatingRef.current = false;

      const next = Math.max(0, Math.min(REVEAL_WIDTH, gestureBaseRef.current - dx));
      offsetRef.current = next;
      setOffset(next);
    }

    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    gestureBaseRef.current = offsetRef.current;
    trackingRef.current = "none";
  }

  function onTouchEnd() {
    if (trackingRef.current !== "h") return;
    snap(offsetRef.current > REVEAL_WIDTH / 2 ? REVEAL_WIDTH : 0);
  }

  return (
    <div
      ref={rowRef}
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL_WIDTH }}
        aria-hidden="true"
      >
        <button
          className="flex-1 bg-blue-500 text-white text-sm font-semibold"
          onClick={() => { snap(0); onEdit(); }}
          tabIndex={offset >= REVEAL_WIDTH ? 0 : -1}
        >
          Edit
        </button>
      </div>
      <div
        className="bg-background"
        style={{
          transform: `translateX(-${offset}px)`,
          transition: animatingRef.current ? "transform 0.2s ease" : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
