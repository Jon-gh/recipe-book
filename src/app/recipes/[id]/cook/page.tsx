"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Recipe } from "@/types";
import { fetcher } from "@/lib/fetcher";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Cocotte from "@/components/cocotte/Cocotte";

function splitInstructions(text: string): string[] {
  const doubled = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (doubled.length > 1) return doubled;
  return text.split(/\n/).map((s) => s.trim()).filter(Boolean);
}

export default function CookModePage() {
  const t = useTranslations("cookMode");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: recipe, isLoading } = useSWR<Recipe>(`/api/recipes/${id}`, fetcher, {
    revalidateIfStale: false,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // WakeLock denied (battery saver, etc.) — silently continue
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    acquireWakeLock();
    // Re-acquire on page visibility change (e.g. user switches tabs and comes back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") acquireWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      releaseWakeLock();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [acquireWakeLock, releaseWakeLock]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <Cocotte pose="stir" size={120} />
        <p className="mt-4 text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <p className="text-muted-foreground">{t("notFound")}</p>
      </div>
    );
  }

  const steps = splitInstructions(recipe.instructions);
  const totalSteps = steps.length;
  const allDone = checkedSteps.size === totalSteps;

  function toggleCheck(index: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function goTo(index: number) {
    const clamped = Math.max(0, Math.min(totalSteps - 1, index));
    setCurrentStep(clamped);
  }

  function handleExit() {
    releaseWakeLock();
    router.back();
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] pb-3 border-b border-border shrink-0">
        <button
          onClick={handleExit}
          className="p-2 -ml-2 rounded-lg active:bg-muted transition-colors"
          aria-label={t("exitCookMode")}
        >
          <X size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{recipe.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("stepOf", { step: currentStep + 1, total: totalSteps })}
          </p>
        </div>
        {allDone && (
          <Cocotte pose="cheer" size={40} label={t("allDone")} />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted shrink-0" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          {/* Step number badge */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
              {currentStep + 1}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {t("step")}
            </span>
          </div>

          {/* Step text */}
          <p className="text-xl leading-relaxed font-medium whitespace-pre-wrap">
            {steps[currentStep]}
          </p>

          {/* Check-off toggle */}
          <button
            onClick={() => toggleCheck(currentStep)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-colors active:scale-95 ${
              checkedSteps.has(currentStep)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
            aria-label={
              checkedSteps.has(currentStep) ? t("uncheckStep") : t("checkStep")
            }
            aria-pressed={checkedSteps.has(currentStep)}
          >
            <Check size={18} />
            <span className="text-sm font-medium">
              {checkedSteps.has(currentStep) ? t("done") : t("markDone")}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 border-t border-border flex items-center gap-3 shrink-0">
        <button
          onClick={() => goTo(currentStep - 1)}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-40 active:bg-muted min-h-[44px]"
          aria-label={t("previousStep")}
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">{t("previous")}</span>
        </button>

        {/* Step dots */}
        <div className="flex-1 flex items-center justify-center gap-1.5 overflow-hidden">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === currentStep
                  ? "w-4 h-2.5 bg-primary"
                  : checkedSteps.has(i)
                  ? "w-2.5 h-2.5 bg-primary/40"
                  : "w-2.5 h-2.5 bg-muted-foreground/30"
              }`}
              aria-label={t("goToStep", { step: i + 1 })}
              aria-current={i === currentStep ? "step" : undefined}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(currentStep + 1)}
          disabled={currentStep === totalSteps - 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border transition-colors disabled:opacity-40 active:bg-muted min-h-[44px]"
          aria-label={t("nextStep")}
        >
          <span className="text-sm font-medium">{t("next")}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
