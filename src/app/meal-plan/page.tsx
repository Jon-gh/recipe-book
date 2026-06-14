"use client";

import { useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MealPlanEntry, Recipe, ShoppingListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Minus, Plus, Search, Trash2 } from "lucide-react";
import { fetcher, noCacheFetcher } from "@/lib/fetcher";
import { useUndoableDelete } from "@/lib/use-undoable-delete";

import { categoryIsStaple } from "@/lib/categories";
import { getRecipeEmoji } from "@/lib/recipe-emoji";
import PullToRefresh from "@/components/PullToRefresh";
import StartNewWeekWizard from "@/components/StartNewWeekWizard";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";
import { useTranslations } from "next-intl";
import { cardBgColor } from "@/lib/card-colors";
import { useToast } from "@/components/Toast";

export default function MealPlanPage() {
  const t = useTranslations("mealPlan");
  const tCommon = useTranslations("common");
  const { show: showToast } = useToast();
  const router = useRouter();

  const {
    data: entries,
    isLoading: loadingEntries,
    error: entriesError,
    mutate: mutateEntries,
  } = useSWR<MealPlanEntry[]>("/api/meal-plan", fetcher);

  const { data: recipes, mutate: mutateRecipes } = useSWR<Recipe[]>(
    "/api/recipes",
    fetcher
  );

  const { mutate: globalMutate } = useSWRConfig();

  const { data: shoppingListItems } = useSWR<ShoppingListItem[]>("/api/shopping-list", noCacheFetcher);


  // ── wizard ──────────────────────────────────────────────────────────────────
  const [showNewWeekWizard, setShowNewWeekWizard] = useState(false);

  async function handleWizardClose(result?: { weekStart: string; weekEnd: string }) {
    setShowNewWeekWizard(false);
    await Promise.all([
      mutateEntries(),
      globalMutate("/api/shopping-list"),
      globalMutate("/api/shopping-session"),
    ]);
    if (result) {
      router.push("/schedule");
    }
  }

  // ── ready-to-cook ────────────────────────────────────────────────────────────
  const shoppingProductIds = useMemo(
    () => new Set((shoppingListItems ?? []).map((i) => i.product.id)),
    [shoppingListItems]
  );

  function isReadyToCook(entry: MealPlanEntry): boolean {
    const nonStaple = entry.recipe.ingredients.filter(
      (i) => !categoryIsStaple(i.product?.category ?? "other")
    );
    if (nonStaple.length === 0) return false;
    return nonStaple.every((i) => !shoppingProductIds.has(i.product.id));
  }

  // ── search / add state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [adding, setAdding] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cancelPressedRef = useRef(false);
  const dropdownPressedRef = useRef(false);

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
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: selectedRecipe.id, targetServings: servings }),
    });
    if (!res.ok) {
      showToast(tCommon("mutationError"), { variant: "error" });
    } else {
      setSelectedRecipe(null);
      setSearch("");
      setServings(2);
    }
    await mutateEntries();
    setAdding(false);
  }

  const { remove: removeEntry } = useUndoableDelete<MealPlanEntry>({
    commit: async (entry) => {
      const res = await fetch(`/api/meal-plan/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onRevert: () => mutateEntries(),
    undoLabel: tCommon("undo"),
  });

  async function updateServings(entryId: number, newServings: number) {
    await mutateEntries(
      entries?.map((e) =>
        e.id === entryId ? { ...e, targetServings: newServings } : e
      ),
      { revalidate: false }
    );
    const res = await fetch(`/api/meal-plan/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetServings: newServings }),
    });
    if (!res.ok) {
      showToast(tCommon("mutationError"), { variant: "error" });
    }
    await mutateEntries();
  }

  function allocatedForEntry(entryId: number) {
    return (
      (entries ?? [])
        .find((e) => e.id === entryId)
        ?.scheduledMeals.reduce((sum, s) => sum + s.servings, 0) ?? 0
    );
  }

  async function handleRefresh() {
    await Promise.all([mutateEntries(), mutateRecipes()]);
  }

  const totalServings = (entries ?? []).reduce((sum, e) => sum + e.targetServings, 0);
  const showCancel = searchFocused || !!selectedRecipe;

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <Button
            size="sm"
            className="gap-1.5 active:scale-95 transition-transform shrink-0"
            onClick={() => setShowNewWeekWizard(true)}
          >
            <CalendarPlus size={15} />
            {t("newWeek")}
          </Button>
        </div>

        {/* Search + add */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (selectedRecipe) setSelectedRecipe(null);
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={handleBlur}
                className="pl-9"
              />
            </div>
            <button
              onPointerDown={() => { cancelPressedRef.current = true; }}
              onPointerCancel={() => { cancelPressedRef.current = false; }}
              onClick={handleCancel}
              className={`overflow-hidden transition-all duration-200 shrink-0 text-primary text-sm font-medium whitespace-nowrap ${
                showCancel ? "max-w-[72px] opacity-100" : "max-w-0 opacity-0 pointer-events-none"
              }`}
            >
              {tCommon("cancel")}
            </button>
          </div>

          {showDropdown && (
            <div className="mt-1 border rounded-xl shadow-sm divide-y overflow-hidden">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t("noRecipesFound")}</p>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted active:bg-muted transition-colors min-h-[44px]"
                    onPointerDown={() => { dropdownPressedRef.current = true; }}
                    onPointerCancel={() => { dropdownPressedRef.current = false; }}
                    onClick={() => selectRecipe(r)}
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
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className="w-8 h-8 rounded-full bg-background border flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-semibold w-8 text-center tabular-nums">{servings}</span>
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
                {adding ? tCommon("adding") : tCommon("add")}
              </Button>
            </div>
          )}
        </div>

        {/* Entries list */}
        {loadingEntries ? (
          <LoadingState message={t("loading")} />
        ) : entriesError ? (
          <EmptyState
            pose="shrug"
            title={tCommon("errorTitle")}
            subtext={tCommon("errorSubtext")}
          />
        ) : (entries ?? []).length === 0 ? (
          <EmptyState
            pose="wave"
            title={t("emptyTitle")}
            subtext={t("emptySubtext")}
            action={{ label: t("emptyBrowseRecipes"), href: "/recipes" }}
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {t("recipeSummary", { recipeCount: entries!.length, totalServings })}
            </p>
            <div className="space-y-2">
              {entries!.map((entry) => {
                const allocated = allocatedForEntry(entry.id);
                const ready = isReadyToCook(entry);
                const cardBg = cardBgColor(entry.recipe.id);
                return (
                  <div key={entry.id} className={`rounded-xl px-4 py-3.5 ${cardBg}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5 shrink-0" aria-hidden="true">
                        {getRecipeEmoji(entry.recipe.ingredients.map((i) => i.product.name))}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <Link
                            href={`/recipes/${entry.recipe.id}`}
                            className="font-medium text-sm leading-snug hover:underline"
                          >
                            {entry.recipe.name}
                          </Link>
                          {ready && (
                            <span className="shrink-0 text-xs font-medium text-primary bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full mt-0.5">
                              {t("ready")}
                            </span>
                          )}
                        </div>
                        {entry.recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.recipe.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {allocated > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("servingsScheduled", { allocated, total: entry.targetServings })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <button
                          onClick={() => updateServings(entry.id, Math.max(1, entry.targetServings - 1))}
                          className="w-7 h-7 rounded-full bg-background/60 flex items-center justify-center active:scale-95 transition-transform p-2 -m-2"
                          aria-label={tCommon("decreaseServings")}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center tabular-nums">
                          {entry.targetServings}
                        </span>
                        <button
                          onClick={() => updateServings(entry.id, entry.targetServings + 1)}
                          className="w-7 h-7 rounded-full bg-background/60 flex items-center justify-center active:scale-95 transition-transform p-2 -m-2"
                          aria-label={tCommon("increaseServings")}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeEntry(entry, {
                          optimisticHide: () => mutateEntries(entries?.filter((e) => e.id !== entry.id), { revalidate: false }),
                          message: t("removedFromPlan", { name: entry.recipe.name }),
                        })}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-2.5 -m-1.5 active:scale-95 transition-transform mt-0.5"
                        aria-label={t("removeFromPlan")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>

    <StartNewWeekWizard
      open={showNewWeekWizard}
      entries={entries ?? []}
      recipes={recipes ?? []}
      shoppingListItems={shoppingListItems ?? []}
      onClose={handleWizardClose}
    />
    </>
  );
}
