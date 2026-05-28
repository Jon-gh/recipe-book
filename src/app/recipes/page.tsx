"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, List, Plus, Search } from "lucide-react";
import { getRecipeEmoji } from "@/lib/recipe-emoji";
import { fetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import RecipeForm from "@/components/RecipeForm";
import LoadingState from "@/components/LoadingState";
import { useTranslations } from "next-intl";

const CARD_BG_COLORS = [
  "bg-amber-50 dark:bg-amber-950/30",
  "bg-rose-50 dark:bg-rose-950/30",
  "bg-orange-50 dark:bg-orange-950/30",
  "bg-emerald-50 dark:bg-emerald-950/30",
  "bg-violet-50 dark:bg-violet-950/30",
  "bg-sky-50 dark:bg-sky-950/30",
];

function cardBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return CARD_BG_COLORS[hash % CARD_BG_COLORS.length];
}

export default function RecipesPage() {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterFavourite, setFilterFavourite] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelPressedRef = useRef(false);

  function handleCancel() {
    cancelPressedRef.current = false;
    setSearch("");
    setSearchFocused(false);
    inputRef.current?.blur();
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => { if (!cancelPressedRef.current) setSearchFocused(false); }}
              className="pl-9"
            />
          </div>
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
              {t("favourites")}
            </Button>
          </div>
          <button
            onPointerDown={() => { cancelPressedRef.current = true; }}
            onPointerCancel={() => { cancelPressedRef.current = false; }}
            onClick={handleCancel}
            className={`overflow-hidden transition-all duration-200 shrink-0 text-[#007AFF] dark:text-blue-400 text-sm font-medium whitespace-nowrap ${
              searchFocused
                ? "max-w-[72px] opacity-100"
                : "max-w-0 opacity-0 pointer-events-none"
            }`}
          >
            {tCommon("cancel")}
          </button>
        </div>

        {isLoading ? (
          <LoadingState emoji="🍳" message={t("loading")} />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-5xl">🔥</span>
            <p className="font-semibold">{tCommon("errorTitle")}</p>
            <p className="text-sm text-muted-foreground">{tCommon("errorSubtext")}</p>
          </div>
        ) : (recipes ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-6xl">🧑‍🍳</span>
            <p className="font-bold text-lg">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{t("emptySubtext")}</p>
            <button
              onClick={() => setShowAddSheet(true)}
              className="mt-2 px-5 py-2.5 rounded-full bg-green-600 text-white text-sm font-semibold active:scale-95 transition-transform"
            >
              {t("emptyAddFirstRecipe")}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(recipes ?? []).map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="active:scale-[0.98] transition-transform block"
              >
                <div
                  className={`h-full rounded-xl shadow-sm ${cardBgColor(recipe.name)} p-4 flex flex-col gap-3 min-h-[160px]`}
                >
                  <div className="text-3xl leading-none">{getRecipeEmoji(recipe.name)}</div>
                  <div className="flex items-start justify-between gap-2 flex-1">
                    <h2 className="text-base font-bold leading-snug">
                      {recipe.name}
                    </h2>
                    {recipe.favourite && (
                      <span className="text-yellow-500 shrink-0 text-lg leading-none">
                        ★
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {tCommon("servings", { count: recipe.servings })}
                      </span>
                      <span className="flex items-center gap-1">
                        <List size={12} />
                        {tCommon("ingredients", { count: recipe.ingredients.length })}
                      </span>
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </PullToRefresh>

    <button
      onClick={() => setShowAddSheet(true)}
      aria-label={t("newRecipe")}
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>

    <BottomSheet
      open={showAddSheet}
      onClose={() => setShowAddSheet(false)}
      title={t("newRecipe")}
    >
      <div className="px-4 pb-8">
        <RecipeForm onClose={() => setShowAddSheet(false)} />
      </div>
    </BottomSheet>
    </>
  );
}
