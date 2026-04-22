"use client";

import { useEffect, useRef, useState } from "react";
import { MealPlanEntry, Recipe, ScheduledMeal } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Minus, Plus, X } from "lucide-react";
import { normalizeUnit } from "@/lib/grocery-list";

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function nextMonday(from: Date = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 1 : 8 - day; // days until next Monday
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
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

type SlotPortions = Record<string, { lunch: number; dinner: number }>;

// ── types ─────────────────────────────────────────────────────────────────────

type NewRecipeEntry = { recipe: Recipe; targetServings: number };

interface Props {
  open: boolean;
  entries: MealPlanEntry[];
  recipes: Recipe[];
  checkedKeys: Set<string>;
  onClose: (result?: { weekStart: string; weekEnd: string }) => void;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function StartNewWeekWizard({
  open,
  entries,
  recipes,
  checkedKeys,
  onClose,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1 — consumed portions
  const [consumed, setConsumed] = useState<Record<number, number>>({});

  // Step 2 — week dates
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");

  // Step 3 — portions per slot
  const [slotPortions, setSlotPortions] = useState<SlotPortions>({});

  // Step 4 — new recipes
  const [newRecipes, setNewRecipes] = useState<NewRecipeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);

  // Step 5 — submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 6 — schedule allocation
  const [confirmedEntries, setConfirmedEntries] = useState<MealPlanEntry[]>([]);
  const [localSlots, setLocalSlots] = useState<ScheduledMeal[]>([]);
  const [slotDate, setSlotDate] = useState<string | null>(null);
  const [slotMealType, setSlotMealType] = useState<"lunch" | "dinner" | null>(null);
  const [slotEntryId, setSlotEntryId] = useState<number | null>(null);
  const [slotServings, setSlotServings] = useState(2);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownPressedRef = useRef(false);
  const cancelPressedRef = useRef(false);

  // Reset wizard when opened
  useEffect(() => {
    if (!open) return;
    setStep(1);
    const init: Record<number, number> = {};
    for (const e of entries) init[e.id] = e.targetServings;
    setConsumed(init);

    const start = nextMonday();
    const end = addDays(start, 6);
    setWeekStart(start);
    setWeekEnd(end);

    const slots: SlotPortions = {};
    for (const d of daysInRange(start, end)) {
      slots[d] = { lunch: 2, dinner: 2 };
    }
    setSlotPortions(slots);
    setNewRecipes([]);
    setSearch("");
    setSearchFocused(false);
    setSelectedRecipe(null);
    setServings(2);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Rebuild slot portions when week dates change
  function applyWeekDates(start: string, end: string) {
    const days = daysInRange(start, end);
    setSlotPortions((prev) => {
      const next: SlotPortions = {};
      for (const d of days) next[d] = prev[d] ?? { lunch: 2, dinner: 2 };
      return next;
    });
  }

  function handleWeekStartChange(val: string) {
    setWeekStart(val);
    if (val && weekEnd) applyWeekDates(val, weekEnd);
  }

  function handleWeekEndChange(val: string) {
    setWeekEnd(val);
    if (weekStart && val) applyWeekDates(weekStart, val);
  }

  // Totals
  const leftoverServings = entries.reduce((sum, e) => {
    const c = consumed[e.id] ?? e.targetServings;
    return sum + Math.max(0, e.targetServings - c);
  }, 0);
  const newServings = newRecipes.reduce((s, r) => s + r.targetServings, 0);
  const totalPlanned = leftoverServings + newServings;
  const totalNeeded = Object.values(slotPortions).reduce(
    (s, p) => s + p.lunch + p.dinner,
    0
  );

  // Step 4 search
  const showDropdown = searchFocused && search.length > 0 && !selectedRecipe;
  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  function selectRecipe(r: Recipe) {
    dropdownPressedRef.current = false;
    setSelectedRecipe(r);
    setServings(r.servings);
    setSearch(r.name);
    setSearchFocused(false);
    searchRef.current?.blur();
  }

  function handleSearchBlur() {
    if (!cancelPressedRef.current && !dropdownPressedRef.current) {
      setSearchFocused(false);
    }
  }

  function handleSearchCancel() {
    cancelPressedRef.current = false;
    setSearch("");
    setSearchFocused(false);
    setSelectedRecipe(null);
    searchRef.current?.blur();
  }

  function addNewRecipe() {
    if (!selectedRecipe) return;
    setNewRecipes((prev) => {
      const existing = prev.find((r) => r.recipe.id === selectedRecipe.id);
      if (existing) {
        return prev.map((r) =>
          r.recipe.id === selectedRecipe.id
            ? { ...r, targetServings: r.targetServings + servings }
            : r
        );
      }
      return [...prev, { recipe: selectedRecipe, targetServings: servings }];
    });
    setSelectedRecipe(null);
    setSearch("");
    setServings(2);
  }

  function removeNewRecipe(recipeId: string) {
    setNewRecipes((prev) => prev.filter((r) => r.recipe.id !== recipeId));
  }

  // Submit
  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/meal-plan/new-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumed: Object.entries(consumed).map(([id, consumedServings]) => ({
            id: Number(id),
            consumedServings,
          })),
          weekStart,
          weekEnd,
          newEntries: newRecipes.map((r) => ({
            recipeId: r.recipe.id,
            targetServings: r.targetServings,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Something went wrong");
        setSubmitting(false);
        return;
      }

      // Grocery transition: for new recipes, create ShoppingListItems for already-bought ingredients
      await runGroceryTransition(newRecipes, checkedKeys);

      const data = await res.json();
      setConfirmedEntries(data.entries ?? []);
      setLocalSlots([]);
      setSubmitting(false);
      setStep(6);
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  // Step 6 — slot helpers
  function openSlotPicker(date: string, mealType: "lunch" | "dinner") {
    setSlotDate(date);
    setSlotMealType(mealType);
    setSlotEntryId(null);
    setSlotServings(2);
    setSlotError(null);
  }

  function closeSlotPicker() {
    setSlotDate(null);
    setSlotMealType(null);
    setSlotError(null);
  }

  function allocatedForEntry(entryId: number) {
    return localSlots
      .filter((m) => m.mealPlanEntryId === entryId)
      .reduce((sum, m) => sum + m.servings, 0);
  }

  function getSlot(date: string, mealType: "lunch" | "dinner") {
    return localSlots.find(
      (m) => m.date.slice(0, 10) === date && m.mealType === mealType
    );
  }

  async function addSlot() {
    if (!slotEntryId || !slotDate || !slotMealType) return;
    setAddingSlot(true);
    setSlotError(null);
    const res = await fetch("/api/scheduled-meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealPlanEntryId: slotEntryId,
        date: slotDate,
        mealType: slotMealType,
        servings: slotServings,
      }),
    });
    if (res.ok) {
      const meal = await res.json();
      setLocalSlots((prev) => [...prev, meal]);
      closeSlotPicker();
    } else {
      const err = await res.json();
      setSlotError(err.error ?? "Failed to add");
    }
    setAddingSlot(false);
  }

  async function removeSlot(id: number) {
    setLocalSlots((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/scheduled-meals/${id}`, { method: "DELETE" });
  }

  const filled = totalPlanned >= totalNeeded;
  const isNextDisabled = step === 2 && (!weekStart || !weekEnd);
  const nextLabel = step === 4 && !filled ? "Next (portions not filled)" : "Next";
  const nextVariant = step === 4 && !filled ? ("outline" as const) : ("default" as const);

  if (!open) return null;

  const scheduleDays = weekStart && weekEnd ? daysInRange(weekStart, weekEnd) : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      aria-modal="true"
      role="dialog"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <button
          onClick={() => onClose()}
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <h2 className="font-semibold text-base">New Week</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          Step {step} of 6
        </span>
      </div>

      {/* Scrollable step content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-4">
        {step > 1 && step < 6 && (
          <button
            onClick={() => setStep((s) => (s - 1) as typeof step)}
            className="flex items-center gap-1 text-sm text-muted-foreground mb-5"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}

        {step === 1 && (
          <Step1
            entries={entries}
            consumed={consumed}
            onConsumedChange={(id, val) =>
              setConsumed((prev) => ({ ...prev, [id]: val }))
            }
          />
        )}

        {step === 2 && (
          <Step2
            weekStart={weekStart}
            weekEnd={weekEnd}
            onWeekStartChange={handleWeekStartChange}
            onWeekEndChange={handleWeekEndChange}
          />
        )}

        {step === 3 && (
          <Step3
            slotPortions={slotPortions}
            totalNeeded={totalNeeded}
            onPortionChange={(day, meal, val) =>
              setSlotPortions((prev) => ({
                ...prev,
                [day]: { ...prev[day], [meal]: val },
              }))
            }
          />
        )}

        {step === 4 && (
          <Step4
            totalNeeded={totalNeeded}
            totalPlanned={totalPlanned}
            leftoverServings={leftoverServings}
            newRecipes={newRecipes}
            recipes={filtered}
            search={search}
            searchFocused={searchFocused}
            selectedRecipe={selectedRecipe}
            servings={servings}
            searchRef={searchRef}
            showDropdown={showDropdown}
            onSearchChange={(v) => {
              setSearch(v);
              if (selectedRecipe) setSelectedRecipe(null);
            }}
            onSearchFocus={() => setSearchFocused(true)}
            onSearchBlur={handleSearchBlur}
            onSearchCancel={handleSearchCancel}
            onSelectRecipe={selectRecipe}
            onServingsChange={setServings}
            onAddRecipe={addNewRecipe}
            onRemoveRecipe={removeNewRecipe}
            onDropdownPointerDown={() => {
              dropdownPressedRef.current = true;
            }}
            onCancelPointerDown={() => {
              cancelPressedRef.current = true;
            }}
          />
        )}

        {step === 5 && (
          <Step5
            weekStart={weekStart}
            weekEnd={weekEnd}
            leftoverServings={leftoverServings}
            newRecipes={newRecipes}
            totalPlanned={totalPlanned}
            totalNeeded={totalNeeded}
            error={error}
          />
        )}

        {step === 6 && (
          <Step6
            confirmedEntries={confirmedEntries}
            scheduleDays={scheduleDays}
            getSlot={getSlot}
            allocatedForEntry={allocatedForEntry}
            onOpenSlot={openSlotPicker}
            onRemoveSlot={removeSlot}
          />
        )}
      </div>

      {/* Pinned navigation footer — always visible */}
      <div className="px-4 pb-8 pt-3 border-t shrink-0">
        {step < 5 && (
          <Button
            className="w-full"
            variant={nextVariant}
            disabled={isNextDisabled}
            onClick={() => setStep((s) => (s + 1) as typeof step)}
          >
            {nextLabel}
          </Button>
        )}
        {step === 5 && (
          <Button className="w-full" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Starting week…" : "Start Week"}
          </Button>
        )}
        {step === 6 && (
          <Button className="w-full" onClick={() => onClose({ weekStart, weekEnd })}>
            Done
          </Button>
        )}
      </div>

      {/* Slot picker overlay (Step 6) */}
      {slotDate && slotMealType && (
        <div
          className="absolute inset-0 bg-black/40 flex items-end z-10"
          onClick={closeSlotPicker}
        >
          <div
            className="w-full bg-background rounded-t-2xl p-5 max-h-[70dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">
                {formatDay(slotDate)} · {slotMealType}
              </h3>
              <button onClick={closeSlotPicker} className="text-muted-foreground p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pick a recipe from your plan
            </p>

            <div className="border rounded-xl divide-y overflow-hidden mb-4">
              {confirmedEntries.map((entry) => {
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
                      const entry = confirmedEntries.find((e) => e.id === slotEntryId);
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

            {slotError && (
              <p className="text-sm text-destructive mb-3">{slotError}</p>
            )}

            <Button
              className="w-full active:scale-95 transition-transform"
              disabled={!slotEntryId || addingSlot}
              onClick={addSlot}
            >
              {addingSlot ? "Adding…" : "Confirm"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({
  entries,
  consumed,
  onConsumedChange,
}: {
  entries: MealPlanEntry[];
  consumed: Record<number, number>;
  onConsumedChange: (id: number, val: number) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">What did you eat?</h3>
      <p className="text-sm text-muted-foreground mb-4">
        How many portions were consumed from each recipe?
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No recipes in your current plan.
        </p>
      ) : (
        <div className="border rounded-xl divide-y overflow-hidden mb-6">
          {entries.map((entry) => {
            const c = consumed[entry.id] ?? entry.targetServings;
            const leftover = entry.targetServings - c;
            return (
              <div key={entry.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.recipe.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.targetServings} portions total
                      {leftover > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                          · {leftover} leftover
                        </span>
                      )}
                      {c >= entry.targetServings && (
                        <span className="text-muted-foreground ml-1">
                          · fully consumed
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onConsumedChange(entry.id, Math.max(0, c - 1))}
                      className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center tabular-nums">
                      {c}
                    </span>
                    <button
                      onClick={() =>
                        onConsumedChange(entry.id, Math.min(entry.targetServings, c + 1))
                      }
                      className="w-7 h-7 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

function Step2({
  weekStart,
  weekEnd,
  onWeekStartChange,
  onWeekEndChange,
}: {
  weekStart: string;
  weekEnd: string;
  onWeekStartChange: (v: string) => void;
  onWeekEndChange: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">New week dates</h3>
      <p className="text-sm text-muted-foreground mb-5">
        When does your new week start and end?
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium block mb-1">Start</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => onWeekStartChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">End</label>
          <input
            type="date"
            value={weekEnd}
            min={weekStart}
            onChange={(e) => onWeekEndChange(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
      </div>

    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

function Step3({
  slotPortions,
  totalNeeded,
  onPortionChange,
}: {
  slotPortions: SlotPortions;
  totalNeeded: number;
  onPortionChange: (day: string, meal: "lunch" | "dinner", val: number) => void;
}) {
  const days = Object.keys(slotPortions).sort();
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">Portions per meal</h3>
      <p className="text-sm text-muted-foreground mb-4">
        How many portions does each meal need?
      </p>

      <div className="border rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                Day
              </th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">
                Lunch
              </th>
              <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">
                Dinner
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {days.map((day) => {
              const p = slotPortions[day] ?? { lunch: 2, dinner: 2 };
              return (
                <tr key={day}>
                  <td className="py-2 px-3 text-xs text-muted-foreground">
                    {formatDay(day)}
                  </td>
                  {(["lunch", "dinner"] as const).map((meal) => (
                    <td key={meal} className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() =>
                            onPortionChange(day, meal, Math.max(0, p[meal] - 1))
                          }
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center tabular-nums">
                          {p[meal]}
                        </span>
                        <button
                          onClick={() => onPortionChange(day, meal, p[meal] + 1)}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground text-center mb-4">
        Total portions needed: <span className="font-semibold text-foreground">{totalNeeded}</span>
      </p>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────────────────

function Step4({
  totalNeeded,
  totalPlanned,
  leftoverServings,
  newRecipes,
  recipes,
  search,
  searchFocused,
  selectedRecipe,
  servings,
  searchRef,
  showDropdown,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onSearchCancel,
  onSelectRecipe,
  onServingsChange,
  onAddRecipe,
  onRemoveRecipe,
  onDropdownPointerDown,
  onCancelPointerDown,
}: {
  totalNeeded: number;
  totalPlanned: number;
  leftoverServings: number;
  newRecipes: NewRecipeEntry[];
  recipes: Recipe[];
  search: string;
  searchFocused: boolean;
  selectedRecipe: Recipe | null;
  servings: number;
  searchRef: React.RefObject<HTMLInputElement>;
  showDropdown: boolean;
  onSearchChange: (v: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchCancel: () => void;
  onSelectRecipe: (r: Recipe) => void;
  onServingsChange: (n: number) => void;
  onAddRecipe: () => void;
  onRemoveRecipe: (id: string) => void;
  onDropdownPointerDown: () => void;
  onCancelPointerDown: () => void;
}) {
  const filled = totalPlanned >= totalNeeded;
  const showCancel = searchFocused || !!selectedRecipe;

  return (
    <div>
      <h3 className="font-semibold text-base mb-1">Add recipes</h3>
      <p className="text-sm text-muted-foreground mb-1">
        Select recipes for the new week.
      </p>

      {/* Tally */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 mb-4 text-sm font-medium ${filled ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400" : "bg-muted/60"}`}>
        <span>
          {leftoverServings > 0 && (
            <span className="text-muted-foreground font-normal mr-1">
              {leftoverServings} leftover +
            </span>
          )}
          {newRecipes.reduce((s, r) => s + r.targetServings, 0)} new
        </span>
        <span>
          <span className={`text-lg font-bold ${filled ? "" : "text-foreground"}`}>{totalPlanned}</span>
          <span className="text-muted-foreground font-normal"> / {totalNeeded} portions</span>
        </span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Input
            ref={searchRef}
            placeholder="Search recipes to add…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            className="flex-1"
          />
          <button
            onPointerDown={onCancelPointerDown}
            onPointerCancel={() => {}}
            onClick={onSearchCancel}
            className={`overflow-hidden transition-all duration-200 shrink-0 text-[#007AFF] dark:text-blue-400 text-sm font-medium whitespace-nowrap ${showCancel ? "max-w-[72px] opacity-100" : "max-w-0 opacity-0 pointer-events-none"}`}
          >
            Cancel
          </button>
        </div>

        {showDropdown && (
          <div className="mt-1 border rounded-xl shadow-sm divide-y overflow-hidden">
            {recipes.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No recipes found.</p>
            ) : (
              recipes.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted active:bg-muted transition-colors min-h-[44px]"
                  onPointerDown={onDropdownPointerDown}
                  onPointerCancel={() => {}}
                  onClick={() => onSelectRecipe(r)}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{r.servings} servings</span>
                </button>
              ))
            )}
          </div>
        )}

        {selectedRecipe && (
          <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-xl">
            <span className="flex-1 text-sm font-medium truncate">{selectedRecipe.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onServingsChange(Math.max(1, servings - 1))}
                className="w-8 h-8 rounded-full bg-background border flex items-center justify-center active:scale-95 transition-transform"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-semibold w-8 text-center tabular-nums">{servings}</span>
              <button
                onClick={() => onServingsChange(servings + 1)}
                className="w-8 h-8 rounded-full bg-background border flex items-center justify-center active:scale-95 transition-transform"
              >
                <Plus size={14} />
              </button>
            </div>
            <Button size="sm" onClick={onAddRecipe} className="active:scale-95 transition-transform shrink-0">
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Added recipes */}
      {newRecipes.length > 0 && (
        <div className="border rounded-xl divide-y overflow-hidden mb-4">
          {newRecipes.map(({ recipe, targetServings }) => (
            <div key={recipe.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm font-medium truncate">{recipe.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{targetServings}p</span>
              <button
                onClick={() => onRemoveRecipe(recipe.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ── Step 5 ────────────────────────────────────────────────────────────────────

function Step5({
  weekStart,
  weekEnd,
  leftoverServings,
  newRecipes,
  totalPlanned,
  totalNeeded,
  error,
}: {
  weekStart: string;
  weekEnd: string;
  leftoverServings: number;
  newRecipes: NewRecipeEntry[];
  totalPlanned: number;
  totalNeeded: number;
  error: string | null;
}) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">Ready to start</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Review your new week before confirming.
      </p>

      <div className="border rounded-xl divide-y overflow-hidden mb-6 text-sm">
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">Week</span>
          <span className="font-medium">
            {formatDay(weekStart)} → {formatDay(weekEnd)}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">Leftover portions</span>
          <span className="font-medium">{leftoverServings}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">New recipes</span>
          <span className="font-medium">{newRecipes.length}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">Total planned</span>
          <span className="font-medium">
            {totalPlanned}
            {totalNeeded > 0 && (
              <span className="text-muted-foreground font-normal"> / {totalNeeded} needed</span>
            )}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4 text-center">{error}</p>
      )}
    </div>
  );
}

// ── Step 6 ────────────────────────────────────────────────────────────────────

function Step6({
  confirmedEntries,
  scheduleDays,
  getSlot,
  allocatedForEntry,
  onOpenSlot,
  onRemoveSlot,
}: {
  confirmedEntries: MealPlanEntry[];
  scheduleDays: string[];
  getSlot: (date: string, mealType: "lunch" | "dinner") => ScheduledMeal | undefined;
  allocatedForEntry: (entryId: number) => number;
  onOpenSlot: (date: string, mealType: "lunch" | "dinner") => void;
  onRemoveSlot: (id: number) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">Schedule meals</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Assign recipes to lunch and dinner slots. You can skip this and do it later.
      </p>

      {confirmedEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No recipes in plan.
        </p>
      ) : (
        <>
          {/* Allocation summary */}
          <div className="border rounded-xl divide-y overflow-hidden mb-4 text-sm">
            {confirmedEntries.map((entry) => {
              const allocated = allocatedForEntry(entry.id);
              return (
                <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="truncate flex-1 mr-2">{entry.recipe.name}</span>
                  <span className={`text-xs shrink-0 ${allocated >= entry.targetServings ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {allocated}/{entry.targetServings}p
                  </span>
                </div>
              );
            })}
          </div>

          {/* Day × meal grid */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-28">Day</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-[42%]">Lunch</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground w-[42%]">Dinner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scheduleDays.map((day) => (
                  <tr key={day}>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground align-top pt-3 leading-tight">
                      {formatDay(day)}
                    </td>
                    {(["lunch", "dinner"] as const).map((mealType) => {
                      const meal = getSlot(day, mealType);
                      return (
                        <td key={mealType} className="py-2 px-2 align-top">
                          {meal ? (
                            <div className="flex items-start gap-1 bg-primary/8 rounded-lg px-2 py-1.5">
                              <span className="text-xs leading-tight flex-1 min-w-0">
                                <span className="font-medium line-clamp-1">
                                  {meal.mealPlanEntry.recipe.name}
                                </span>
                                <span className="text-muted-foreground block">{meal.servings}p</span>
                              </span>
                              <button
                                onClick={() => onRemoveSlot(meal.id)}
                                className="text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
                                aria-label="Remove slot"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => onOpenSlot(day, mealType)}
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
    </div>
  );
}

// ── grocery transition helper ─────────────────────────────────────────────────

async function runGroceryTransition(
  newRecipes: NewRecipeEntry[],
  checkedKeys: Set<string>
) {
  for (const { recipe, targetServings } of newRecipes) {
    const factor = targetServings / recipe.servings;
    for (const ing of recipe.ingredients) {
      const { canonical, factor: unitFactor } = normalizeUnit(ing.unit);
      const key = `${ing.product.name.toLowerCase()}__${canonical}`;
      if (!checkedKeys.has(key)) continue;
      const qty = Math.round(ing.quantity * factor * unitFactor * 1000) / 1000;
      await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ing.product.name,
          quantity: qty,
          unit: canonical,
          category: ing.product.category,
        }),
      });
    }
  }
}
