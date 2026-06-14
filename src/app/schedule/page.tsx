"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { MealPlanEntry, ScheduledMeal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import { useTranslations, useLocale } from "next-intl";
import { useUndoableDelete } from "@/lib/use-undoable-delete";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayStr() {
  return toDateStr(new Date());
}

function daysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  const end = new Date(to + "T00:00:00");
  const d = new Date(from + "T00:00:00");
  while (d <= end) {
    days.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDay(dateStr: string, locale: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatWeekRange(from: string, to: string, locale: string) {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const startStr = start.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const t = useTranslations("schedule");
  const tCommon = useTranslations("common");
  const tPlan = useTranslations("mealPlan");
  const locale = useLocale();
  const {
    data: entries,
    isLoading: loadingEntries,
    error: entriesError,
    mutate: mutateEntries,
  } = useSWR<MealPlanEntry[]>("/api/meal-plan", fetcher);

  const { data: sessionData } = useSWR<{
    weekStart: string | null;
    weekEnd: string | null;
  }>("/api/shopping-session", fetcher);

  const [scheduleFrom, setScheduleFrom] = useState<string | null>(null);
  const [scheduleTo, setScheduleTo] = useState<string | null>(null);

  const sessionApplied = useRef(false);
  useEffect(() => {
    if (sessionApplied.current || !sessionData) return;
    sessionApplied.current = true;
    if (sessionData.weekStart) setScheduleFrom(sessionData.weekStart.slice(0, 10));
    if (sessionData.weekEnd) setScheduleTo(sessionData.weekEnd.slice(0, 10));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData]);

  const scheduleKey = scheduleFrom && scheduleTo
    ? `/api/scheduled-meals?from=${scheduleFrom}&to=${scheduleTo}`
    : null;
  const { data: scheduledMeals, mutate: mutateSchedule } =
    useSWR<ScheduledMeal[]>(scheduleKey, fetcher);

  // ── slot state ──────────────────────────────────────────────────────────────
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [slotMealType, setSlotMealType] = useState<"lunch" | "dinner" | null>(null);
  const [slotEntryId, setSlotEntryId] = useState<number | null>(null);
  const [slotServings, setSlotServings] = useState(2);
  const [slotNote, setSlotNote] = useState("");
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // ── helpers ─────────────────────────────────────────────────────────────────

  function getMeal(dateStr: string, mealType: "lunch" | "dinner") {
    return (scheduledMeals ?? []).find(
      (m) => m.date.slice(0, 10) === dateStr && m.mealType === mealType
    );
  }

  function allocatedForEntry(entryId: number) {
    return (
      (entries ?? [])
        .find((e) => e.id === entryId)
        ?.scheduledMeals.reduce((sum, s) => sum + s.servings, 0) ?? 0
    );
  }

  function openAddSlot(dateStr: string, mealType: "lunch" | "dinner") {
    setSlotDate(dateStr);
    setSlotMealType(mealType);
    setSlotEntryId(null);
    setSlotServings(2);
    setSlotNote("");
    setSlotError(null);
  }

  async function confirmAddSlot() {
    if (!slotDate || !slotMealType) return;
    if (!slotEntryId && !slotNote.trim()) return;
    setAddingSlot(true);
    setSlotError(null);
    const body = slotNote.trim()
      ? { note: slotNote.trim(), date: slotDate, mealType: slotMealType, servings: 1 }
      : { mealPlanEntryId: slotEntryId, date: slotDate, mealType: slotMealType, servings: slotServings };
    const res = await fetch("/api/scheduled-meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await Promise.all([mutateSchedule(), mutateEntries()]);
      setSlotDate(null);
      setSlotMealType(null);
      setSlotNote("");
    } else {
      const err = await res.json();
      setSlotError(err.error ?? t("failedToAdd"));
    }
    setAddingSlot(false);
  }

  const { remove: removeSlot } = useUndoableDelete<ScheduledMeal>({
    commit: async (meal) => {
      const res = await fetch(`/api/scheduled-meals/${meal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onRevert: () => Promise.all([mutateSchedule(), mutateEntries()]),
    undoLabel: tCommon("undo"),
  });

  async function handleRefresh() {
    await Promise.all([mutateEntries(), mutateSchedule()]);
  }

  const today = todayStr();
  const days = scheduleFrom && scheduleTo ? daysInRange(scheduleFrom, scheduleTo) : [];
  const hasWeek = !!(scheduleFrom && scheduleTo);

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="mb-5">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          {hasWeek && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatWeekRange(scheduleFrom!, scheduleTo!, locale)}
            </p>
          )}
        </div>

        {loadingEntries ? (
          <LoadingState message={t("loading")} />
        ) : entriesError ? (
          <EmptyState
            pose="shrug"
            title={tCommon("errorTitle")}
            subtext={tCommon("errorSubtext")}
          />
        ) : !hasWeek ? (
          <EmptyState
            pose="shrug"
            title={t("noWeekTitle")}
            subtext={t("noWeekHint")}
            action={{ label: tPlan("newWeek"), href: "/meal-plan" }}
          />
        ) : (entries ?? []).length === 0 ? (
          <EmptyState
            pose="wave"
            title={t("noEntriesTitle")}
            subtext={t("noEntriesHint")}
            action={{ label: tPlan("emptyBrowseRecipes"), href: "/recipes" }}
          />
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`rounded-xl overflow-hidden border ${isToday ? "border-amber-300 dark:border-amber-700" : "border-border"}`}
                >
                  <div className={`px-4 py-2 flex items-center gap-2 ${isToday ? "bg-amber-50 dark:bg-amber-950/20" : "bg-muted/50"}`}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {formatDay(day, locale)}
                    </p>
                    {isToday && (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                        {t("today")}
                      </span>
                    )}
                  </div>
                  <div className="divide-y">
                    {(["lunch", "dinner"] as const).map((mealType) => {
                      const meal = getMeal(day, mealType);
                      return (
                        <div key={mealType} className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
                          <span className="text-base shrink-0" aria-hidden="true">
                            {mealType === "lunch" ? "☀️" : "🌙"}
                          </span>
                          {meal ? (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                {meal.note ? (
                                  <p className="text-sm italic text-muted-foreground leading-snug">
                                    {meal.note}
                                  </p>
                                ) : (
                                  <>
                                    <p className="text-sm font-medium leading-snug">
                                      {meal.mealPlanEntry?.recipe.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {tCommon("servings", { count: meal.servings })}
                                    </p>
                                  </>
                                )}
                              </div>
                              <button
                                onClick={() => removeSlot(meal, {
                                  optimisticHide: () => mutateSchedule(
                                    scheduledMeals?.filter((m) => m.id !== meal.id),
                                    { revalidate: false }
                                  ),
                                  message: t("removedMeal"),
                                })}
                                className="text-muted-foreground hover:text-destructive shrink-0 p-2.5 -m-1.5 active:scale-95 transition-transform"
                                aria-label={t("removeMeal")}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openAddSlot(day, mealType)}
                              className="flex-1 border-2 border-dashed border-muted-foreground/25 rounded-full px-4 py-1 text-sm text-muted-foreground/60 text-left hover:border-muted-foreground/40 hover:text-muted-foreground active:scale-95 transition-all"
                            >
                              + {t("addMeal")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>

    {/* Add slot sheet */}
    <BottomSheet
      open={!!(slotDate && slotMealType)}
      onClose={() => { setSlotDate(null); setSlotMealType(null); }}
      title={
        slotDate && slotMealType
          ? `${formatDay(slotDate, locale)} · ${slotMealType === "lunch" ? "☀️ " + t("lunch") : "🌙 " + t("dinner")}`
          : ""
      }
    >
      <div className="px-5 pb-8 pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          {t("pickRecipeOrNote")}
        </p>

        {(entries ?? []).length > 0 && (
          <div className="border rounded-xl divide-y overflow-hidden mb-4">
            {(entries ?? []).map((entry) => {
              const allocated = allocatedForEntry(entry.id);
              const remaining = entry.targetServings - allocated;
              const disabled = remaining <= 0;
              return (
                <button
                  key={entry.id}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setSlotEntryId(entry.id);
                    setSlotServings(Math.min(2, remaining));
                    setSlotNote("");
                    setSlotError(null);
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    slotEntryId === entry.id
                      ? "bg-primary/10"
                      : "hover:bg-muted active:bg-muted"
                  } ${disabled ? "opacity-40 pointer-events-none" : ""}`}
                >
                  <div className="font-medium text-sm">{entry.recipe.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("servingsRemaining", { remaining, total: entry.targetServings })}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {slotEntryId && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm flex-1">{t("servings")}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSlotServings((s) => Math.max(1, s - 1))}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-semibold w-8 text-center tabular-nums">
                {slotServings}
              </span>
              <button
                onClick={() => {
                  const entry = entries?.find((e) => e.id === slotEntryId);
                  if (!entry) return;
                  const remaining = entry.targetServings - allocatedForEntry(entry.id);
                  setSlotServings((s) => Math.min(s + 1, remaining));
                }}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {(entries ?? []).length > 0 ? t("orCustomNote") : t("customNote")}
          </label>
          <Input
            placeholder={t("customNotePlaceholder")}
            value={slotNote}
            onChange={(e) => {
              setSlotNote(e.target.value);
              if (e.target.value) setSlotEntryId(null);
            }}
          />
        </div>

        {slotError && (
          <p className="text-sm text-destructive mb-3">{slotError}</p>
        )}

        <Button
          className="w-full active:scale-95 transition-transform"
          disabled={(!slotEntryId && !slotNote.trim()) || addingSlot}
          onClick={confirmAddSlot}
        >
          {addingSlot ? tCommon("adding") : tCommon("confirm")}
        </Button>
      </div>
    </BottomSheet>
    </>
  );
}
