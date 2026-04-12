"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, List, Plus } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import RecipeForm from "@/components/RecipeForm";

const CARD_COLORS = [
  "border-l-green-500",
  "border-l-blue-500",
  "border-l-orange-400",
  "border-l-purple-500",
  "border-l-rose-500",
  "border-l-amber-500",
];

function cardColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return CARD_COLORS[hash % CARD_COLORS.length];
}

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterFavourite, setFilterFavourite] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCancel() {
    setSearch("");
    setSearchFocused(false);
    inputRef.current?.blur();
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("q", debouncedSearch);
  if (filterFavourite) params.set("favourite", "true");

  const { data: recipes, isLoading, error, mutate } = useSWR<Recipe[]>(
    `/api/recipes?${params}`,
    fetcher
  );

  return (
    <>
    <PullToRefresh onRefresh={() => mutate()}>
      <div>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold">Recipes</h1>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <Input
            ref={inputRef}
            placeholder="Search by name, tag or ingredient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1"
          />
          <div
            className={`overflow-hidden transition-all duration-200 shrink-0 ${
              searchFocused ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
            }`}
          >
            <Button
              variant={filterFavourite ? "default" : "outline"}
              onClick={() => setFilterFavourite((f) => !f)}
              className="active:scale-95 transition-transform shrink-0 whitespace-nowrap"
            >
              ★ Favourites
            </Button>
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); handleCancel(); }}
            onClick={handleCancel}
            className={`overflow-hidden transition-all duration-200 shrink-0 text-[#007AFF] dark:text-blue-400 text-sm font-medium whitespace-nowrap ${
              searchFocused
                ? "max-w-[72px] opacity-100"
                : "max-w-0 opacity-0 pointer-events-none"
            }`}
          >
            Cancel
          </button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-destructive">
            Failed to load recipes. Check your connection and try again.
          </p>
        ) : (recipes ?? []).length === 0 ? (
          <p className="text-muted-foreground">
            No recipes found.{" "}
            <button onClick={() => setShowAddSheet(true)} className="underline">
              Add one!
            </button>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(recipes ?? []).map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="active:scale-[0.98] transition-transform block"
              >
                <div
                  className={`h-full rounded-lg border bg-card shadow-sm border-l-4 ${cardColor(recipe.name)} p-5 flex flex-col gap-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold leading-tight">
                      {recipe.name}
                    </h2>
                    {recipe.favourite && (
                      <span className="text-yellow-400 shrink-0 text-xl leading-none">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {`${recipe.servings} serving${recipe.servings !== 1 ? "s" : ""}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <List size={14} />
                      {`${recipe.ingredients.length} ingredient${recipe.ingredients.length !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </PullToRefresh>

    {/* FAB — outside PullToRefresh so CSS transform doesn't break position:fixed */}
    <button
      onClick={() => setShowAddSheet(true)}
      aria-label="Add recipe"
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>

    <BottomSheet
      open={showAddSheet}
      onClose={() => setShowAddSheet(false)}
      title="New Recipe"
    >
      <div className="px-4 pb-8">
        <RecipeForm onClose={() => setShowAddSheet(false)} />
      </div>
    </BottomSheet>
    </>
  );
}
