"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { MealPlanEntry, ScheduledMeal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
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

function formatDay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const {
    data: entries,
    isLoading: loadingEntries,
    mutate: mutateEntries,
  } = useSWR<MealPlanEntry[]>("/api/meal-plan", fetcher);

  const [scheduleFrom, setScheduleFrom] = useState(() => toDateStr(new Date()));
  const [scheduleTo, setScheduleTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return toDateStr(d);
  });

  const scheduleKey = `/api/scheduled-meals?from=${scheduleFrom}&to=${scheduleTo}`;
  const { data: scheduledMeals, mutate: mutateSchedule } =
    useSWR<ScheduledMeal[]>(scheduleKey, fetcher);

  const { data: sessionData } = useSWR<{
    checkedKeys: string[];
    weekStart: string | null;
    weekEnd: string | null;
  }>("/api/shopping-session", fetcher);

  const sessionApplied = useRef(false);
  useEffect(() => {
    if (sessionApplied.current || !sessionData) return;
    sessionApplied.current = true;
    if (sessionData.weekStart) setScheduleFrom(sessionData.weekStart.slice(0, 10));
    if (sessionData.weekEnd) setScheduleTo(sessionData.weekEnd.slice(0, 10));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData]);

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
      setSlotError(err.error ?? "Failed to add");
    }
    setAddingSlot(false);
  }

  async function removeSlot(id: number) {
    await mutateSchedule(scheduledMeals?.filter((m) => m.id !== id), {
      revalidate: false,
    });
    await fetch(`/api/scheduled-meals/${id}`, { method: "DELETE" });
    await Promise.all([mutateSchedule(), mutateEntries()]);
  }

  async function handleRefresh() {
    await Promise.all([mutateEntries(), mutateSchedule()]);
  }

  const days = daysInRange(scheduleFrom, scheduleTo);

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="mb-5">
          <h1 className="text-2xl font-bold">Schedule</h1>
        </div>

        {loadingEntries ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (entries ?? []).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-5xl mb-4">📅</p>
            <p className="font-medium text-foreground">No recipes in your plan yet</p>
            <p className="text-sm mt-1">Add recipes in the Plan tab first</p>
          </div>
        ) : (
          <>
            {/* Date range picker */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="date"
                value={scheduleFrom}
                onChange={(e) => setScheduleFrom(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm bg-background"
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                value={scheduleTo}
                min={scheduleFrom}
                onChange={(e) => setScheduleTo(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm bg-background"
              />
            </div>

            {/* Day cards */}
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day} className="border rounded-xl overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {formatDay(day)}
                    </p>
                  </div>
                  <div className="divide-y">
                    {(["lunch", "dinner"] as const).map((mealType) => {
                      const meal = getMeal(day, mealType);
                      return (
                        <div key={mealType} className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
                          <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">
                            {mealType === "lunch" ? "Lunch" : "Dinner"}
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
                                      {meal.servings} serving{meal.servings !== 1 ? "s" : ""}
                                    </p>
                                  </>
                                )}
                              </div>
                              <button
                                onClick={() => removeSlot(meal.id)}
                                className="text-muted-foreground hover:text-destructive shrink-0 p-1 active:scale-95 transition-transform"
                                aria-label="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openAddSlot(day, mealType)}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                            >
                              <Plus size={14} />
                              Add meal
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>

    {/* Add slot sheet — outside PullToRefresh so transform doesn't break fixed positioning */}
    {slotDate && slotMealType && (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/40"
        onClick={() => setSlotDate(null)}
      >
        <div
          className="w-full bg-background rounded-t-2xl p-5 shadow-xl max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">
              {formatDay(slotDate)} · {slotMealType === "lunch" ? "Lunch" : "Dinner"}
            </h3>
            <button
              onClick={() => setSlotDate(null)}
              className="text-muted-foreground p-1"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Pick a recipe or add a custom note
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
                      {remaining} of {entry.targetServings} servings remaining
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {slotEntryId && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm flex-1">Servings</span>
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
              {(entries ?? []).length > 0 ? "Or add a custom note" : "Custom note"}
            </label>
            <Input
              placeholder="e.g. Eating outside, Dinner with friends…"
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
            {addingSlot ? "Adding…" : "Confirm"}
          </Button>
        </div>
      </div>
    )}
    </>
  );
}
