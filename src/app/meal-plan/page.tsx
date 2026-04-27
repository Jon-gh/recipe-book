"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { MealPlanEntry, Recipe, ScheduledMeal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Minus, Plus, Trash2, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { categoryIsStaple } from "@/lib/categories";
import PullToRefresh from "@/components/PullToRefresh";
import StartNewWeekWizard from "@/components/StartNewWeekWizard";

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

export default function MealPlanPage() {
  const {
    data: entries,
    isLoading: loadingEntries,
    mutate: mutateEntries,
  } = useSWR<MealPlanEntry[]>("/api/meal-plan", fetcher);

  const { data: recipes, mutate: mutateRecipes } = useSWR<Recipe[]>(
    "/api/recipes",
    fetcher
  );

  const { mutate: globalMutate } = useSWRConfig();

  // ── new week wizard state ───────────────────────────────────────────────────
  const [showNewWeekWizard, setShowNewWeekWizard] = useState(false);

  async function handleWizardClose(result?: { weekStart: string; weekEnd: string }) {
    setShowNewWeekWizard(false);
    if (result) {
      setScheduleFrom(result.weekStart);
      setScheduleTo(result.weekEnd);
    }
    await Promise.all([
      mutateEntries(),
      mutateSchedule(),
      globalMutate("/api/shopping-list"),
      globalMutate("/api/shopping-session"),
    ]);
  }

  // ── basket state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [adding, setAdding] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelPressedRef = useRef(false);
  const dropdownPressedRef = useRef(false);

  // ── schedule state ──────────────────────────────────────────────────────────
  const [scheduleFrom, setScheduleFrom] = useState(() => toDateStr(new Date()));
  const [scheduleTo, setScheduleTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return toDateStr(d);
  });

  // Slot being added: date + mealType identify the cell
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [slotMealType, setSlotMealType] = useState<"lunch" | "dinner" | null>(null);
  const [slotEntryId, setSlotEntryId] = useState<number | null>(null);
  const [slotServings, setSlotServings] = useState(2);
  const [slotNote, setSlotNote] = useState("");
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const scheduleKey = `/api/scheduled-meals?from=${scheduleFrom}&to=${scheduleTo}`;
  const {
    data: scheduledMeals,
    mutate: mutateSchedule,
  } = useSWR<ScheduledMeal[]>(scheduleKey, fetcher);

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

  const checkedKeys = useMemo(
    () => new Set(sessionData?.checkedKeys ?? []),
    [sessionData]
  );

  const checkedNames = useMemo(() => {
    const names = new Set<string>();
    for (const key of sessionData?.checkedKeys ?? []) {
      names.add(key.split("__")[0]);
    }
    return names;
  }, [sessionData]);

  function isReadyToCook(entry: MealPlanEntry): boolean {
    const nonStaple = entry.recipe.ingredients.filter(
      (i) => !categoryIsStaple(i.product?.category ?? "other")
    );
    if (nonStaple.length === 0) return false;
    return nonStaple.every((i) => checkedNames.has(i.product.name.toLowerCase()));
  }

  // ── basket helpers ──────────────────────────────────────────────────────────
  const showDropdown = searchFocused && search.length > 0 && !selectedRecipe;
  const filtered = (recipes ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleBlur() {
    if (!cancelPressedRef.current && !dropdownPressedRef.current) {
      setSearchFocused(false);
    }
  }

  function handleCancel() {
    cancelPressedRef.current = false;
    setSearch("");
    setSearchFocused(false);
    setSelectedRecipe(null);
    inputRef.current?.blur();
  }

  function selectRecipe(r: Recipe) {
    dropdownPressedRef.current = false;
    setSelectedRecipe(r);
    setServings(r.servings);
    setSearch(r.name);
    setSearchFocused(false);
    inputRef.current?.blur();
  }

  async function addEntry() {
    if (!selectedRecipe) return;
    setAdding(true);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: selectedRecipe.id,
        targetServings: servings,
      }),
    });
    await mutateEntries();
    setSelectedRecipe(null);
    setSearch("");
    setServings(2);
    setAdding(false);
  }

  async function removeEntry(id: number) {
    await mutateEntries(entries?.filter((e) => e.id !== id), {
      revalidate: false,
    });
    await fetch(`/api/meal-plan/${id}`, { method: "DELETE" });
    await Promise.all([mutateEntries(), mutateSchedule()]);
  }

  async function updateServings(entryId: number, newServings: number) {
    await mutateEntries(
      entries?.map((e) =>
        e.id === entryId ? { ...e, targetServings: newServings } : e
      ),
      { revalidate: false }
    );
    await fetch(`/api/meal-plan/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetServings: newServings }),
    });
    await mutateEntries();
  }

  async function handleRefresh() {
    await Promise.all([mutateEntries(), mutateRecipes(), mutateSchedule()]);
  }

  // ── schedule helpers ────────────────────────────────────────────────────────
  function getMeal(dateStr: string, mealType: "lunch" | "dinner") {
    return (scheduledMeals ?? []).find(
      (m) => m.date.slice(0, 10) === dateStr && m.mealType === mealType
    );
  }

  function allocatedForEntry(entryId: number) {
    return (entries ?? [])
      .find((e) => e.id === entryId)
      ?.scheduledMeals.reduce((sum, s) => sum + s.servings, 0) ?? 0;
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

  const totalServings = (entries ?? []).reduce(
    (sum, e) => sum + e.targetServings,
    0
  );
  const showCancel = searchFocused || !!selectedRecipe;
  const days = daysInRange(scheduleFrom, scheduleTo);

  const [activeTab, setActiveTab] = useState<"plan" | "schedule">("plan");

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Meal Plan</h1>
          <Button
            size="sm"
            className="gap-1.5 active:scale-95 transition-transform shrink-0"
            onClick={() => setShowNewWeekWizard(true)}
          >
            <CalendarPlus size={15} />
            New Week
          </Button>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div role="tablist" className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
          <button
            role="tab"
            aria-selected={activeTab === "plan"}
            onClick={() => setActiveTab("plan")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "plan"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Plan
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "schedule"}
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "schedule"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Schedule
          </button>
        </div>

        {/* ── Plan tab ─────────────────────────────────────────────────────── */}
        {activeTab === "plan" && (
          <>
            {/* Search + add */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Search recipes to add…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (selectedRecipe) setSelectedRecipe(null);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={handleBlur}
                  className="flex-1"
                />
                <button
                  onPointerDown={() => {
                    cancelPressedRef.current = true;
                  }}
                  onPointerCancel={() => {
                    cancelPressedRef.current = false;
                  }}
                  onClick={handleCancel}
                  className={`overflow-hidden transition-all duration-200 shrink-0 text-[#007AFF] dark:text-blue-400 text-sm font-medium whitespace-nowrap ${
                    showCancel
                      ? "max-w-[72px] opacity-100"
                      : "max-w-0 opacity-0 pointer-events-none"
                  }`}
                >
                  Cancel
                </button>
              </div>

              {showDropdown && (
                <div className="mt-1 border rounded-xl shadow-sm divide-y overflow-hidden">
                  {filtered.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      No recipes found.
                    </p>
                  ) : (
                    filtered.map((r) => (
                      <button
                        key={r.id}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-muted active:bg-muted transition-colors min-h-[44px]"
                        onPointerDown={() => {
                          dropdownPressedRef.current = true;
                        }}
                        onPointerCancel={() => {
                          dropdownPressedRef.current = false;
                        }}
                        onClick={() => selectRecipe(r)}
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {r.servings} servings
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedRecipe && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-xl">
                  <span className="flex-1 text-sm font-medium truncate">
                    {selectedRecipe.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      className="w-8 h-8 rounded-full bg-background border flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-8 text-center tabular-nums">
                      {servings}
                    </span>
                    <button
                      onClick={() => setServings((s) => s + 1)}
                      className="w-8 h-8 rounded-full bg-background border flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={addEntry}
                    disabled={adding}
                    className="active:scale-95 transition-transform shrink-0"
                  >
                    {adding ? "Adding…" : "Add"}
                  </Button>
                </div>
              )}
            </div>

            {/* Entries list */}
            {loadingEntries ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (entries ?? []).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-5xl mb-4">🍽️</p>
                <p className="font-medium text-foreground">No recipes planned yet</p>
                <p className="text-sm mt-1">
                  Search above to add recipes to your plan
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {entries!.length} recipe{entries!.length !== 1 ? "s" : ""} ·{" "}
                  {totalServings} total servings
                </p>
                <div className="border rounded-xl overflow-hidden divide-y">
                  {entries!.map((entry) => {
                    const allocated = allocatedForEntry(entry.id);
                    const ready = isReadyToCook(entry);
                    return (
                      <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 ${ready ? "bg-green-50 dark:bg-green-950/20" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Link
                              href={`/recipes/${entry.recipe.id}`}
                              className="font-medium text-sm leading-snug hover:underline line-clamp-1"
                            >
                              {entry.recipe.name}
                            </Link>
                            {ready && (
                              <span className="shrink-0 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full">
                                Ready
                              </span>
                            )}
                          </div>
                          {entry.recipe.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.recipe.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs py-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {allocated > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {allocated}/{entry.targetServings} servings scheduled
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              updateServings(
                                entry.id,
                                Math.max(1, entry.targetServings - 1)
                              )
                            }
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                            aria-label="Decrease servings"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-sm font-semibold w-6 text-center tabular-nums">
                            {entry.targetServings}
                          </span>
                          <button
                            onClick={() =>
                              updateServings(entry.id, entry.targetServings + 1)
                            }
                            className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                            aria-label="Increase servings"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0 p-1 active:scale-95 transition-transform"
                          aria-label="Remove from plan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Schedule tab ─────────────────────────────────────────────────── */}
        {activeTab === "schedule" && (
          <>
            {loadingEntries ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (entries ?? []).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-5xl mb-4">📅</p>
                <p className="font-medium text-foreground">No recipes in your plan yet</p>
                <p className="text-sm mt-1">
                  Add recipes in the Plan tab first
                </p>
              </div>
            ) : (
              <>
                {/* Date range picker */}
                <div className="flex items-center gap-2 mb-4 text-sm">
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

                {/* Day × meal grid */}
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-28">
                          Day
                        </th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-[42%]">
                          Lunch
                        </th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-[42%]">
                          Dinner
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {days.map((day) => (
                        <tr key={day}>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground align-top pt-3 leading-tight">
                            {formatDay(day)}
                          </td>
                          {(["lunch", "dinner"] as const).map((mealType) => {
                            const meal = getMeal(day, mealType);
                            return (
                              <td key={mealType} className="py-2 px-2 align-top">
                                {meal ? (
                                  meal.note ? (
                                    <div className="flex items-start gap-1 bg-muted/60 rounded-lg px-2 py-1.5">
                                      <span className="text-xs leading-tight flex-1 min-w-0 italic text-muted-foreground line-clamp-2">
                                        {meal.note}
                                      </span>
                                      <button
                                        onClick={() => removeSlot(meal.id)}
                                        className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
                                        aria-label="Remove slot"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-1 bg-primary/8 rounded-lg px-2 py-1.5">
                                      <span className="text-xs leading-tight flex-1 min-w-0">
                                        <span className="font-medium line-clamp-1">
                                          {meal.mealPlanEntry?.recipe.name}
                                        </span>
                                        <span className="text-muted-foreground block">
                                          {meal.servings}p
                                        </span>
                                      </span>
                                      <button
                                        onClick={() => removeSlot(meal.id)}
                                        className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
                                        aria-label="Remove slot"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <button
                                    onClick={() => openAddSlot(day, mealType)}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 py-1 px-1 rounded active:scale-95 transition-transform"
                                  >
                                    <Plus size={12} />
                                    Add
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </PullToRefresh>

    {/* ── Add slot bottom sheet — outside PullToRefresh so transform doesn't break fixed positioning ── */}
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
                  {formatDay(slotDate)} · {slotMealType}
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
                        <div className="font-medium text-sm">
                          {entry.recipe.name}
                        </div>
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
                        const remaining =
                          entry.targetServings - allocatedForEntry(entry.id);
                        setSlotServings((s) => Math.min(s + 1, remaining));
                      }}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Custom note */}
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

    <StartNewWeekWizard
      open={showNewWeekWizard}
      entries={entries ?? []}
      recipes={recipes ?? []}
      checkedKeys={checkedKeys}
      onClose={handleWizardClose}
    />
    </>
  );
}
