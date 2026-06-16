"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MealPlanEntry, Recipe, ShoppingListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Minus, Plus, X } from "lucide-react";
import { getRecipeEmoji } from "@/lib/recipe-emoji";
import { categoryIsStaple } from "@/lib/categories";
import { cardBgColor } from "@/lib/card-colors";
import { useTranslations, useLocale } from "next-intl";

type StapleAddition = { productId: number; name: string; qty: string; unit: string };

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
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
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

function formatDay(dateStr: string, locale: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDayShort(dateStr: string, locale: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    weekday: d.toLocaleDateString(locale, { weekday: "short" }),
    date: d.getDate(),
  };
}

function todayStr() {
  return toDateStr(new Date());
}

// ── types ─────────────────────────────────────────────────────────────────────

type NewRecipeEntry = { recipe: Recipe; targetServings: number };

type ScheduleSource = {
  recipeName: string;
  ingredientNames: string[];
  totalServings: number;
  existingEntryId?: number;
  newRecipeId?: string;
};

type PlanSlot = {
  id: string;
  date: string;
  mealType: "lunch" | "dinner";
  servings: number;
  recipeName?: string;
  existingEntryId?: number;
  newRecipeId?: string;
  customNote?: string;
};

interface Props {
  open: boolean;
  entries: MealPlanEntry[];
  recipes: Recipe[];
  shoppingListItems: ShoppingListItem[];
  onClose: (result?: { weekStart: string; weekEnd: string }) => void;
}

// ── progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total = 7 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            s < step
              ? "bg-primary flex-1"
              : s === step
              ? "bg-primary flex-[1.5] ring-2 ring-primary/25 ring-offset-1"
              : "bg-muted flex-1"
          }`}
        />
      ))}
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function StartNewWeekWizard({
  open,
  entries,
  recipes,
  shoppingListItems: _shoppingListItems,
  onClose,
}: Props) {
  const t = useTranslations("wizard");
  const tCommon = useTranslations("common");
  const tSchedule = useTranslations("schedule");
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Step 1 — consumed portions
  const [consumed, setConsumed] = useState<Record<number, number>>({});

  // Step 2 — week dates (always Mon–Sun)
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");

  // Step 3 — global defaults + per-day exceptions
  const [lunchDefault, setLunchDefault] = useState(2);
  const [dinnerDefault, setDinnerDefault] = useState(2);
  const [exceptions, setExceptions] = useState<Record<string, { lunch?: number; dinner?: number }>>({});

  // Step 4 — new recipes
  const [newRecipes, setNewRecipes] = useState<NewRecipeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);

  // Step 5 — schedule planning
  const [planSlots, setPlanSlots] = useState<PlanSlot[]>([]);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [pickerMealType, setPickerMealType] = useState<"lunch" | "dinner" | null>(null);
  const [pickerSource, setPickerSource] = useState<ScheduleSource | null>(null);
  const [pickerServings, setPickerServings] = useState(2);
  const [pickerNote, setPickerNote] = useState("");

  // Step 6 — pantry check
  const [stapleAdditions, setStapleAdditions] = useState<StapleAddition[]>([]);

  // Step 7 — submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setWeekStart(start);
    setWeekEnd(addDays(start, 6));

    setLunchDefault(2);
    setDinnerDefault(2);
    setExceptions({});
    setNewRecipes([]);
    setPlanSlots([]);
    setSearch("");
    setSearchFocused(false);
    setSelectedRecipe(null);
    setServings(2);
    setStapleAdditions([]);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Week navigation helpers (step 2)
  function shiftWeek(n: number) {
    const newStart = addDays(weekStart, n);
    setWeekStart(newStart);
    setWeekEnd(addDays(newStart, 6));
  }

  // Step 3 helpers
  function resolvedPortions(day: string): { lunch: number; dinner: number } {
    return {
      lunch: exceptions[day]?.lunch ?? lunchDefault,
      dinner: exceptions[day]?.dinner ?? dinnerDefault,
    };
  }

  function setException(day: string, meal: "lunch" | "dinner", val: number) {
    setExceptions((prev) => ({
      ...prev,
      [day]: { ...prev[day], [meal]: val },
    }));
  }

  function clearException(day: string) {
    setExceptions((prev) => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
  }

  // Totals
  const scheduleDays = weekStart && weekEnd ? daysInRange(weekStart, weekEnd) : [];
  const leftoverServings = entries.reduce((sum, e) => {
    const c = consumed[e.id] ?? e.targetServings;
    return sum + Math.max(0, e.targetServings - c);
  }, 0);
  const newServings = newRecipes.reduce((s, r) => s + r.targetServings, 0);
  const totalPlanned = leftoverServings + newServings;
  const totalNeeded = scheduleDays.reduce((sum, day) => {
    const p = resolvedPortions(day);
    return sum + p.lunch + p.dinner;
  }, 0);

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

  // Step 5 — schedule helpers
  const scheduleSources = useMemo<ScheduleSource[]>(() => {
    const sources: ScheduleSource[] = [];
    for (const entry of entries) {
      const c = consumed[entry.id] ?? entry.targetServings;
      const leftover = entry.targetServings - c;
      if (leftover > 0) {
        sources.push({ recipeName: entry.recipe.name, ingredientNames: entry.recipe.ingredients.map((i) => i.product.name), totalServings: leftover, existingEntryId: entry.id });
      }
    }
    for (const { recipe, targetServings } of newRecipes) {
      sources.push({ recipeName: recipe.name, ingredientNames: recipe.ingredients.map((i) => i.product.name), totalServings: targetServings, newRecipeId: recipe.id });
    }
    return sources;
  }, [entries, consumed, newRecipes]);

  function remainingForSource(src: ScheduleSource): number {
    const allocated = planSlots
      .filter((s) =>
        src.existingEntryId != null
          ? s.existingEntryId === src.existingEntryId
          : s.newRecipeId === src.newRecipeId
      )
      .reduce((sum, s) => sum + s.servings, 0);
    return src.totalServings - allocated;
  }

  function getPlanSlot(date: string, mealType: "lunch" | "dinner") {
    return planSlots.find((s) => s.date === date && s.mealType === mealType);
  }

  function openPicker(date: string, mealType: "lunch" | "dinner") {
    setPickerDate(date);
    setPickerMealType(mealType);
    setPickerSource(null);
    setPickerServings(2);
    setPickerNote("");
  }

  function closePicker() {
    setPickerDate(null);
    setPickerMealType(null);
    setPickerSource(null);
    setPickerNote("");
  }

  function confirmPickerSlot() {
    if (!pickerDate || !pickerMealType) return;
    const id = String(Date.now());
    if (pickerNote.trim()) {
      setPlanSlots((prev) => [
        ...prev,
        { id, date: pickerDate, mealType: pickerMealType, servings: 1, customNote: pickerNote.trim() },
      ]);
    } else if (pickerSource) {
      setPlanSlots((prev) => [
        ...prev,
        {
          id,
          date: pickerDate,
          mealType: pickerMealType,
          servings: pickerServings,
          recipeName: pickerSource.recipeName,
          existingEntryId: pickerSource.existingEntryId,
          newRecipeId: pickerSource.newRecipeId,
        },
      ]);
    } else {
      return;
    }
    closePicker();
  }

  function removePlanSlot(id: string) {
    setPlanSlots((prev) => prev.filter((s) => s.id !== id));
  }

  // Step 6 — submit
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
          slots: planSlots.map((s) => ({
            date: s.date,
            mealType: s.mealType,
            servings: s.servings,
            existingEntryId: s.existingEntryId,
            newRecipeId: s.newRecipeId,
            note: s.customNote,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? t("somethingWentWrong"));
        setSubmitting(false);
        return;
      }

      // POST any staple items the user selected in step 6
      for (const addition of stapleAdditions) {
        await fetch("/api/shopping-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: addition.name,
            quantity: parseFloat(addition.qty) || 1,
            unit: addition.unit,
          }),
        });
      }

      onClose({ weekStart, weekEnd });
    } catch {
      setError(t("somethingWentWrong"));
      setSubmitting(false);
    }
  }

  // Staple items from this wizard run's new recipes (unique by productId)
  const wizardStaples = useMemo(() => {
    const seen = new Set<number>();
    const items: { productId: number; name: string; defaultQuantity: number; defaultUnit: string }[] = [];
    for (const { recipe } of newRecipes) {
      for (const ing of recipe.ingredients) {
        if (categoryIsStaple(ing.product.category) && !seen.has(ing.product.id)) {
          seen.add(ing.product.id);
          items.push({
            productId: ing.product.id,
            name: ing.product.name,
            defaultQuantity: ing.product.defaultQuantity,
            defaultUnit: ing.product.defaultUnit,
          });
        }
      }
    }
    return items;
  }, [newRecipes]);

  const filled = totalPlanned >= totalNeeded;
  const isNextDisabled = step === 2 && (!weekStart || !weekEnd);
  const nextLabel = step === 4 && !filled ? t("nextPortionsNotFilled") : t("next");
  const nextVariant = step === 4 && !filled ? ("outline" as const) : ("default" as const);

  if (!open) return null;

  return (
    <>
    {/* Main overlay */}
    <div
      className="fixed inset-0 z-50 bg-background overflow-hidden"
      aria-modal="true"
      role="dialog"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label={tCommon("close")}
          >
            <X size={20} />
          </button>
          <h2 className="font-semibold text-base">{t("title")}</h2>
        </div>
        <ProgressBar step={step} />
      </div>

      {/* Scrollable step content */}
      <div className="overflow-y-auto h-full px-4 pt-4 pb-28">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as typeof step)}
            className="flex items-center gap-1 text-sm text-muted-foreground mb-5"
          >
            <ChevronLeft size={16} />
            {tCommon("back")}
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
            onShiftWeek={shiftWeek}
          />
        )}

        {step === 3 && (
          <Step3
            scheduleDays={scheduleDays}
            lunchDefault={lunchDefault}
            dinnerDefault={dinnerDefault}
            exceptions={exceptions}
            totalNeeded={totalNeeded}
            onLunchDefaultChange={setLunchDefault}
            onDinnerDefaultChange={setDinnerDefault}
            onSetException={setException}
            onClearException={clearException}
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
            onDropdownPointerDown={() => { dropdownPressedRef.current = true; }}
            onCancelPointerDown={() => { cancelPressedRef.current = true; }}
          />
        )}

        {step === 5 && (
          <Step5
            scheduleSources={scheduleSources}
            planSlots={planSlots}
            scheduleDays={scheduleDays}
            resolvedPortions={resolvedPortions}
            getPlanSlot={getPlanSlot}
            onOpenPicker={openPicker}
            onRemoveSlot={removePlanSlot}
          />
        )}

        {step === 6 && (
          <Step6
            staples={wizardStaples}
            additions={stapleAdditions}
            onAdd={(s) => {
              setStapleAdditions((prev) => [
                ...prev.filter((a) => a.productId !== s.productId),
                { productId: s.productId, name: s.name, qty: String(s.defaultQuantity), unit: s.defaultUnit },
              ]);
            }}
            onRemove={(id) => setStapleAdditions((prev) => prev.filter((a) => a.productId !== id))}
          />
        )}

        {step === 7 && (
          <Step7
            weekStart={weekStart}
            weekEnd={weekEnd}
            leftoverServings={leftoverServings}
            newRecipes={newRecipes}
            totalPlanned={totalPlanned}
            totalNeeded={totalNeeded}
            planSlots={planSlots}
            error={error}
          />
        )}
      </div>
    </div>

    {/* Footer */}
    <div
      className="fixed bottom-0 left-0 right-0 z-[51] bg-background border-t px-4 pt-3"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {step < 7 && (
        <Button
          className="w-full"
          variant={nextVariant}
          disabled={isNextDisabled}
          onClick={() => setStep((s) => (s + 1) as typeof step)}
          data-testid="wizard-next"
        >
          {nextLabel}
        </Button>
      )}
      {step === 7 && (
        <Button className="w-full" onClick={handleConfirm} disabled={submitting}>
          {submitting ? t("startingWeek") : t("startWeek")}
        </Button>
      )}
    </div>

    {/* Slot picker overlay */}
    {pickerDate && pickerMealType && (
      <div
        className="fixed inset-0 bg-black/40 flex items-end z-[52]"
        onClick={closePicker}
      >
        <div
          className="w-full bg-background rounded-t-2xl p-5 max-h-[80dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm">
              {formatDay(pickerDate, locale)} · {pickerMealType === "lunch" ? "☀️" : "🌙"} {pickerMealType}
            </h3>
            <button onClick={closePicker} className="text-muted-foreground p-1">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {tSchedule("pickRecipeOrNote")}
          </p>

          {scheduleSources.length > 0 && (
            <div className="border rounded-xl divide-y overflow-hidden mb-4">
              {scheduleSources.map((src, i) => {
                const remaining = remainingForSource(src);
                const disabled = remaining <= 0;
                const selected =
                  pickerSource != null &&
                  src.existingEntryId === pickerSource.existingEntryId &&
                  src.newRecipeId === pickerSource.newRecipeId;
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setPickerSource(src);
                      setPickerServings(Math.min(2, remaining));
                      setPickerNote("");
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selected ? "bg-primary/10" : "hover:bg-muted active:bg-muted"
                    } ${disabled ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    <div className="font-medium text-sm">{src.recipeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {tSchedule("servingsRemaining", { remaining, total: src.totalServings })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {pickerSource && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm flex-1">{tSchedule("servings")}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPickerServings((s) => Math.max(1, s - 1))}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-semibold w-8 text-center tabular-nums">{pickerServings}</span>
                <button
                  onClick={() => {
                    const remaining = remainingForSource(pickerSource);
                    setPickerServings((s) => Math.min(s + 1, remaining));
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
              {scheduleSources.length > 0 ? tSchedule("orCustomNote") : tSchedule("customNote")}
            </label>
            <Input
              placeholder={tSchedule("customNotePlaceholder")}
              value={pickerNote}
              onChange={(e) => {
                setPickerNote(e.target.value);
                if (e.target.value) setPickerSource(null);
              }}
            />
          </div>

          <Button
            className="w-full active:scale-95 transition-transform"
            disabled={!pickerSource && !pickerNote.trim()}
            onClick={confirmPickerSlot}
          >
            {tCommon("confirm")}
          </Button>
        </div>
      </div>
    )}
    </>
  );
}

// ── Step 1 — pastel recipe cards ──────────────────────────────────────────────

function Step1({
  entries,
  consumed,
  onConsumedChange,
}: {
  entries: MealPlanEntry[];
  consumed: Record<number, number>;
  onConsumedChange: (id: number, val: number) => void;
}) {
  const t = useTranslations("wizard");
  const tCommon = useTranslations("common");
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step1Title")}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t("step1Subtitle")}</p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t("noRecipesInPlan")}</p>
      ) : (
        <div className="space-y-2 mb-6">
          {entries.map((entry) => {
            const c = consumed[entry.id] ?? entry.targetServings;
            const leftover = entry.targetServings - c;
            const cardBg = cardBgColor(String(entry.id));
            return (
              <div key={entry.id} className={`rounded-xl px-4 py-3.5 ${cardBg}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0" aria-hidden="true">
                    {getRecipeEmoji(entry.recipe.name, entry.recipe.ingredients.map((i) => i.product.name))}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.recipe.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("portionsTotal", { total: entry.targetServings })}
                      {leftover > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 ml-1">
                          · {t("leftover", { count: leftover })}
                        </span>
                      )}
                      {c >= entry.targetServings && (
                        <span className="text-muted-foreground ml-1">· {t("fullyConsumed")}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onConsumedChange(entry.id, Math.max(0, c - 1))}
                      className="w-7 h-7 rounded-full bg-background/60 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label={tCommon("decreaseServings")}
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center tabular-nums">{c}</span>
                    <button
                      onClick={() => onConsumedChange(entry.id, Math.min(entry.targetServings, c + 1))}
                      className="w-7 h-7 rounded-full bg-background/60 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label={tCommon("increaseServings")}
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

// ── Step 2 — week chip navigation ─────────────────────────────────────────────

function Step2({
  weekStart,
  weekEnd,
  onShiftWeek,
}: {
  weekStart: string;
  weekEnd: string;
  onShiftWeek: (n: number) => void;
}) {
  const t = useTranslations("wizard");
  const locale = useLocale();
  const today = todayStr();
  const days = weekStart && weekEnd ? daysInRange(weekStart, weekEnd) : [];

  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step2Title")}</h3>
      <p className="text-sm text-muted-foreground mb-5">{t("step2Subtitle")}</p>

      <div className="flex items-center justify-between mb-3 gap-3">
        <button
          onClick={() => onShiftWeek(-7)}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 active:scale-95 transition-transform text-sm font-medium"
          aria-label={t("previousWeek")}
        >
          ←
        </button>

        <div className="flex-1 flex items-center justify-center gap-1">
          {days.map((day) => {
            const { weekday, date } = formatDayShort(day, locale);
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`flex flex-col items-center justify-center w-10 h-12 rounded-xl text-xs font-medium transition-colors ${
                  isToday
                    ? "bg-primary text-primary-foreground ring-2 ring-amber-400"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <span className="opacity-75 text-[10px]">{weekday}</span>
                <span className="font-bold text-sm leading-none">{date}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onShiftWeek(7)}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 active:scale-95 transition-transform text-sm font-medium"
          aria-label={t("nextWeek")}
        >
          →
        </button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {weekStart && weekEnd ? `${formatDay(weekStart, locale)} – ${formatDay(weekEnd, locale)}` : ""}
      </p>
    </div>
  );
}

// ── Step 3 — global defaults + per-day exceptions ─────────────────────────────

function Step3({
  scheduleDays,
  lunchDefault,
  dinnerDefault,
  exceptions,
  totalNeeded,
  onLunchDefaultChange,
  onDinnerDefaultChange,
  onSetException,
  onClearException,
}: {
  scheduleDays: string[];
  lunchDefault: number;
  dinnerDefault: number;
  exceptions: Record<string, { lunch?: number; dinner?: number }>;
  totalNeeded: number;
  onLunchDefaultChange: (v: number) => void;
  onDinnerDefaultChange: (v: number) => void;
  onSetException: (day: string, meal: "lunch" | "dinner", val: number) => void;
  onClearException: (day: string) => void;
}) {
  const t = useTranslations("wizard");
  const tSchedule = useTranslations("schedule");
  const locale = useLocale();
  const today = todayStr();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step3Title")}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t("step3Subtitle")}</p>

      {/* Global defaults */}
      <div className="border rounded-xl divide-y overflow-hidden mb-4">
        {(["lunch", "dinner"] as const).map((meal) => {
          const val = meal === "lunch" ? lunchDefault : dinnerDefault;
          const onChange = meal === "lunch" ? onLunchDefaultChange : onDinnerDefaultChange;
          return (
            <div key={meal} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg shrink-0" aria-hidden="true">{meal === "lunch" ? "☀️" : "🌙"}</span>
              <span className="text-sm font-medium flex-1">
                {meal === "lunch" ? tSchedule("lunch") : tSchedule("dinner")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange(Math.max(0, val - 1))}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus size={13} />
                </button>
                <span className="text-sm font-semibold w-7 text-center tabular-nums">{val}</span>
                <button
                  onClick={() => onChange(val + 1)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-day exception chips */}
      {scheduleDays.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("perDayExceptions")}</p>
          <div className="flex gap-1.5 flex-wrap">
            {scheduleDays.map((day) => {
              const { weekday, date } = formatDayShort(day, locale);
              const hasException = !!exceptions[day];
              const isToday = day === today;
              const isExpanded = expandedDay === day;
              return (
                <div key={day} className="flex flex-col">
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                    className={`relative flex flex-col items-center justify-center w-10 h-12 rounded-xl text-xs font-medium transition-colors ${
                      isExpanded
                        ? "bg-primary text-primary-foreground"
                        : isToday
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="opacity-75 text-[10px]">{weekday}</span>
                    <span className="font-bold text-sm leading-none">{date}</span>
                    {hasException && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 bg-muted/50 border rounded-xl p-3 min-w-[180px] absolute z-10">
                      {(["lunch", "dinner"] as const).map((meal) => {
                        const resolved = meal === "lunch"
                          ? (exceptions[day]?.lunch ?? lunchDefault)
                          : (exceptions[day]?.dinner ?? dinnerDefault);
                        return (
                          <div key={meal} className="flex items-center gap-2 mb-2 last:mb-0">
                            <span className="text-sm shrink-0">{meal === "lunch" ? "☀️" : "🌙"}</span>
                            <span className="text-xs flex-1">{meal === "lunch" ? tSchedule("lunch") : tSchedule("dinner")}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onSetException(day, meal, Math.max(0, resolved - 1))}
                                className="w-6 h-6 rounded-full bg-background flex items-center justify-center active:scale-95"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="text-xs font-semibold w-5 text-center">{resolved}</span>
                              <button
                                onClick={() => onSetException(day, meal, resolved + 1)}
                                className="w-6 h-6 rounded-full bg-background flex items-center justify-center active:scale-95"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {(exceptions[day]) && (
                        <button
                          onClick={() => onClearException(day)}
                          className="text-xs text-muted-foreground hover:text-foreground mt-1"
                        >
                          {t("resetToDefault")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center mb-4">
        {t("totalPortionsNeeded", { count: totalNeeded })}
      </p>
    </div>
  );
}

// ── Step 4 — pastel recipe cards ──────────────────────────────────────────────

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
  const t = useTranslations("wizard");
  const tCommon = useTranslations("common");
  const tMealPlan = useTranslations("mealPlan");
  const filled = totalPlanned >= totalNeeded;
  const showCancel = searchFocused || !!selectedRecipe;

  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step4Title")}</h3>
      <p className="text-sm text-muted-foreground mb-1">{t("step4Subtitle")}</p>

      {/* Tally */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 mb-4 text-sm font-medium ${filled ? "bg-primary/10 text-primary" : "bg-muted/60"}`}>
        <span>
          {leftoverServings > 0 && (
            <span className="text-muted-foreground font-normal mr-1">{t("tallyLeftover", { count: leftoverServings })}</span>
          )}
          {t("tallyNew", { count: newRecipes.reduce((s, r) => s + r.targetServings, 0) })}
        </span>
        <span>
          <span className={`text-lg font-bold ${filled ? "" : "text-foreground"}`}>{totalPlanned}</span>
          <span className="text-muted-foreground font-normal">{t("tallyPortions", { count: totalNeeded })}</span>
        </span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Input
            ref={searchRef}
            placeholder={tMealPlan("searchPlaceholder")}
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
            className={`overflow-hidden transition-all duration-200 shrink-0 text-primary text-sm font-medium whitespace-nowrap ${showCancel ? "max-w-[72px] opacity-100" : "max-w-0 opacity-0 pointer-events-none"}`}
          >
            {tCommon("cancel")}
          </button>
        </div>

        {showDropdown && (
          <div className="mt-1 border rounded-xl shadow-sm divide-y overflow-hidden">
            {recipes.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{t("noRecipesFound")}</p>
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
                  <span className="text-muted-foreground ml-2 text-xs">{tCommon("servings", { count: r.servings })}</span>
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
              {tCommon("add")}
            </Button>
          </div>
        )}
      </div>

      {/* Added recipes — pastel cards */}
      {newRecipes.length > 0 && (
        <div className="space-y-2 mb-4">
          {newRecipes.map(({ recipe, targetServings }) => (
            <div
              key={recipe.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${cardBgColor(recipe.id)}`}
            >
              <span className="text-xl shrink-0" aria-hidden="true">{getRecipeEmoji(recipe.name, recipe.ingredients.map((i) => i.product.name))}</span>
              <span className="flex-1 text-sm font-medium truncate">{recipe.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{targetServings}p</span>
              <button
                onClick={() => onRemoveRecipe(recipe.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 p-1 active:scale-95 transition-transform"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 5 — schedule with dashed pills ───────────────────────────────────────

function Step5({
  scheduleSources,
  planSlots,
  scheduleDays,
  resolvedPortions,
  getPlanSlot,
  onOpenPicker,
  onRemoveSlot,
}: {
  scheduleSources: ScheduleSource[];
  planSlots: PlanSlot[];
  scheduleDays: string[];
  resolvedPortions: (day: string) => { lunch: number; dinner: number };
  getPlanSlot: (date: string, mealType: "lunch" | "dinner") => PlanSlot | undefined;
  onOpenPicker: (date: string, mealType: "lunch" | "dinner") => void;
  onRemoveSlot: (id: string) => void;
}) {
  const t = useTranslations("wizard");
  const tCommon = useTranslations("common");
  const tSchedule = useTranslations("schedule");
  const locale = useLocale();
  const today = todayStr();

  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step5Title")}</h3>
      <p className="text-sm text-muted-foreground mb-4">{t("step5Subtitle")}</p>

      {/* Source allocation summary — pastel rows */}
      {scheduleSources.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {scheduleSources.map((src, i) => {
            const allocated = planSlots
              .filter((s) =>
                src.existingEntryId != null
                  ? s.existingEntryId === src.existingEntryId
                  : s.newRecipeId === src.newRecipeId
              )
              .reduce((sum, s) => sum + s.servings, 0);
            return (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm ${cardBgColor(String(src.existingEntryId ?? src.newRecipeId ?? i))}`}
              >
                <span className="truncate flex-1 mr-2">
                  <span className="mr-1.5" aria-hidden="true">{getRecipeEmoji(src.recipeName, src.ingredientNames)}</span>
                  {src.recipeName}
                </span>
                <span className={`text-xs shrink-0 font-medium ${allocated >= src.totalServings ? "text-primary" : "text-muted-foreground"}`}>
                  {allocated}/{src.totalServings}p
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Day cards */}
      <div className="space-y-3">
        {scheduleDays.map((day) => {
          const isToday = day === today;
          const p = resolvedPortions(day);
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
                    {tSchedule("today")}
                  </span>
                )}
              </div>
              <div className="divide-y">
                {(["lunch", "dinner"] as const).map((mealType) => {
                  const slot = getPlanSlot(day, mealType);
                  const targetPortions = p[mealType];
                  return (
                    <div key={mealType} className="flex items-center gap-3 px-4 py-3 min-h-[44px]">
                      <span className="text-base shrink-0" aria-hidden="true">
                        {mealType === "lunch" ? "☀️" : "🌙"}
                      </span>
                      {slot ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            {slot.customNote ? (
                              <p className="text-sm italic text-muted-foreground leading-snug">{slot.customNote}</p>
                            ) : (
                              <>
                                <p className="text-sm font-medium leading-snug">{slot.recipeName}</p>
                                <p className="text-xs text-muted-foreground">{tCommon("servings", { count: slot.servings })}</p>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => onRemoveSlot(slot.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0 p-1 active:scale-95 transition-transform"
                            aria-label={tSchedule("removeMeal")}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onOpenPicker(day, mealType)}
                          className="flex flex-col active:scale-95 transition-transform"
                        >
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border-2 border-dashed border-muted-foreground/25 rounded-full px-3 py-0.5">
                            <Plus size={12} />
                            {tSchedule("addMeal")}
                          </span>
                          {targetPortions > 0 && (
                            <span className="text-xs text-muted-foreground/60 ml-1 mt-0.5">
                              {t("portionsNeeded", { count: targetPortions })}
                            </span>
                          )}
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
    </div>
  );
}

// ── Step 6 — pantry check ─────────────────────────────────────────────────────

type WizardStapleItem = { productId: number; name: string; defaultQuantity: number; defaultUnit: string };

function Step6({
  staples,
  additions,
  onAdd,
  onRemove,
}: {
  staples: WizardStapleItem[];
  additions: StapleAddition[];
  onAdd: (item: WizardStapleItem) => void;
  onRemove: (productId: number) => void;
}) {
  const t = useTranslations("wizard");
  const tCheckin = useTranslations("stapleCheckin");

  if (staples.length === 0) {
    return (
      <div>
        <h3 className="font-semibold text-base mb-1">{t("step6Title")}</h3>
        <p className="text-sm text-muted-foreground py-6 text-center">{t("step6Empty")}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step6Title")}</h3>
      <p className="text-sm text-muted-foreground mb-5">{t("step6Subtitle")}</p>
      <ul className="space-y-3">
        {staples.map((s) => {
          const added = additions.find((a) => a.productId === s.productId);
          if (added) {
            return (
              <li key={s.productId} className="flex items-center gap-2 opacity-50">
                <span className="flex-1 text-sm font-medium line-through">{s.name}</span>
                <span className="text-xs text-muted-foreground">{added.qty} {added.unit}</span>
                <button
                  onClick={() => onRemove(s.productId)}
                  className="text-muted-foreground hover:text-foreground px-1 text-base shrink-0"
                  aria-label={t("removeItem", { name: s.name })}
                >
                  ×
                </button>
              </li>
            );
          }
          const defaultQty = String(s.defaultQuantity > 0 ? s.defaultQuantity : 1);
          return (
            <li key={s.productId} className="flex items-center gap-2">
              <span className="flex-1 font-medium text-sm">{s.name}</span>
              <Input
                type="number"
                min={0}
                step="any"
                defaultValue={defaultQty}
                id={`staple-qty-${s.productId}`}
                className="w-16 text-center"
                aria-label={tCheckin("quantityLabel")}
              />
              <Input
                defaultValue={s.defaultUnit}
                id={`staple-unit-${s.productId}`}
                placeholder={tCheckin("unitPlaceholder")}
                className="w-20"
                aria-label={tCheckin("unitLabel")}
              />
              <button
                onClick={() => {
                  const qtyEl = document.getElementById(`staple-qty-${s.productId}`) as HTMLInputElement | null;
                  const unitEl = document.getElementById(`staple-unit-${s.productId}`) as HTMLInputElement | null;
                  onAdd({ ...s, defaultQuantity: parseFloat(qtyEl?.value ?? defaultQty) || 1, defaultUnit: unitEl?.value ?? s.defaultUnit });
                }}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform shrink-0"
                aria-label={tCheckin("addLabel", { name: s.name })}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Step 7 — confirm ──────────────────────────────────────────────────────────

function Step7({
  weekStart,
  weekEnd,
  leftoverServings,
  newRecipes,
  totalPlanned,
  totalNeeded,
  planSlots,
  error,
}: {
  weekStart: string;
  weekEnd: string;
  leftoverServings: number;
  newRecipes: NewRecipeEntry[];
  totalPlanned: number;
  totalNeeded: number;
  planSlots: PlanSlot[];
  error: string | null;
}) {
  const t = useTranslations("wizard");
  const locale = useLocale();
  return (
    <div>
      <h3 className="font-semibold text-base mb-1">{t("step7Title")}</h3>
      <p className="text-sm text-muted-foreground mb-5">{t("step7Subtitle")}</p>

      <div className="border rounded-xl divide-y overflow-hidden mb-6 text-sm">
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">{t("weekLabel")}</span>
          <span className="font-medium">{formatDay(weekStart, locale)} → {formatDay(weekEnd, locale)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">{t("leftoverPortions")}</span>
          <span className="font-medium">{leftoverServings}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">{t("newRecipesLabel")}</span>
          <span className="font-medium">{newRecipes.length}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">{t("totalPlanned")}</span>
          <span className="font-medium">
            {totalPlanned}
            {totalNeeded > 0 && (
              <span className="text-muted-foreground font-normal"> / {totalNeeded} {t("needed")}</span>
            )}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-muted-foreground">{t("mealsScheduled")}</span>
          <span className="font-medium">{planSlots.length}</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4 text-center">{error}</p>}
    </div>
  );
}

