"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;
const MAX_PULL = 90;

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [fingerDown, setFingerDown] = useState(false);
  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const pullYRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setFingerDown(true);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        isPulling.current = true;
        const damped = Math.min(delta * 0.45, MAX_PULL);
        pullYRef.current = damped;
        setPullY(damped);
        e.preventDefault();
      }
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    setFingerDown(false);
    if (!isPulling.current) return;
    isPulling.current = false;
    startY.current = null;

    if (pullYRef.current >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      pullYRef.current = THRESHOLD;
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullY(0);
        pullYRef.current = 0;
      }
    } else {
      setPullY(0);
      pullYRef.current = 0;
    }
  }, [refreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const indicatorHeight = refreshing ? THRESHOLD : pullY;
  const progress = Math.min(pullY / THRESHOLD, 1);
  const visible = indicatorHeight > 0;
  const animating = !fingerDown;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 flex justify-center items-end bg-background z-50 pointer-events-none"
        style={{
          height: `${indicatorHeight}px`,
          opacity: visible ? 1 : 0,
          transition: animating ? "height 0.25s ease-out, opacity 0.25s ease-out" : "none",
        }}
      >
        {visible && (
          <div className="pb-3">
            <RefreshCw
              size={22}
              className={refreshing ? "animate-spin text-primary" : "text-muted-foreground"}
              style={{
                transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
                opacity: Math.max(progress, 0.25),
              }}
            />
          </div>
        )}
      </div>
      <div
        style={{
          transform: `translateY(${indicatorHeight}px)`,
          transition: animating ? "transform 0.25s ease-out" : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </>
  );
}
