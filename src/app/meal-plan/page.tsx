"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { MealPlanEntry, Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";

export default function MealPlanPage() {
  const {
    data: entries,
    isLoading: loadingEntries,
    mutate: mutateEntries,
  } = useSWR<MealPlanEntry[]>("/api/meal-plan", fetcher);

  const {
    data: recipes,
    mutate: mutateRecipes,
  } = useSWR<Recipe[]>("/api/recipes", fetcher);

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [adding, setAdding] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Prevents onBlur from collapsing the search bar/dropdown before a tap on
  // Cancel or a dropdown result has had a chance to fire its click event.
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
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: selectedRecipe.id, targetServings: servings }),
    });
    await mutateEntries();
    setSelectedRecipe(null);
    setSearch("");
    setServings(2);
    setAdding(false);
  }

  async function removeEntry(id: number) {
    // Optimistic remove
    await mutateEntries(entries?.filter((e) => e.id !== id), { revalidate: false });
    await fetch(`/api/meal-plan/${id}`, { method: "DELETE" });
    await mutateEntries();
  }

  async function updateServings(entryId: number, newServings: number) {
    // Optimistic update
    await mutateEntries(
      entries?.map((e) => (e.id === entryId ? { ...e, targetServings: newServings } : e)),
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
    await Promise.all([mutateEntries(), mutateRecipes()]);
  }

  const totalServings = (entries ?? []).reduce((sum, e) => sum + e.targetServings, 0);
  const showCancel = searchFocused || !!selectedRecipe;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold">Meal Plan</h1>
          <Link href="/grocery-list">
            <Button variant="outline" size="sm" className="gap-1.5 active:scale-95 transition-transform">
              <ShoppingCart size={15} />
              Grocery List
            </Button>
          </Link>
        </div>

        {/* Search bar + add flow */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder="Search recipes to add…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // Typing again after a selection deselects
                if (selectedRecipe) setSelectedRecipe(null);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={handleBlur}
              className="flex-1"
            />
            <button
              onPointerDown={() => { cancelPressedRef.current = true; }}
              onPointerCancel={() => { cancelPressedRef.current = false; }}
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

          {/* Dropdown results */}
          {showDropdown && (
            <div className="mt-1 border rounded-xl shadow-sm divide-y overflow-hidden">
              {filtered.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No recipes found.</p>
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
                    <span className="text-muted-foreground ml-2 text-xs">
                      {r.servings} servings
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Confirmation row: shown once a recipe is selected */}
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

        {/* Plan entries */}
        {loadingEntries ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (entries ?? []).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="font-medium text-foreground">No recipes planned yet</p>
            <p className="text-sm mt-1">Search above to add recipes to your plan</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {entries!.length} recipe{entries!.length !== 1 ? "s" : ""} · {totalServings} total servings
            </p>
            <div className="border rounded-xl overflow-hidden divide-y">
              {entries!.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/recipes/${entry.recipe.id}`}
                      className="font-medium text-sm leading-snug hover:underline line-clamp-1"
                    >
                      {entry.recipe.name}
                    </Link>
                    {entry.recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.recipe.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Servings stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        updateServings(entry.id, Math.max(1, entry.targetServings - 1))
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
                      onClick={() => updateServings(entry.id, entry.targetServings + 1)}
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
              ))}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
