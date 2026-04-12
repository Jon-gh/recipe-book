"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { MealPlanEntry, Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    isLoading: loadingRecipes,
    mutate: mutateRecipes,
  } = useSWR<Recipe[]>("/api/recipes", fetcher);

  const [search, setSearch] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [servings, setServings] = useState(2);
  const [adding, setAdding] = useState(false);

  const loading = loadingEntries || loadingRecipes;

  const filtered = (recipes ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  async function addEntry() {
    if (!selectedRecipeId) return;
    setAdding(true);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: selectedRecipeId, targetServings: servings }),
    });
    await mutateEntries();
    setSelectedRecipeId("");
    setServings(2);
    setAdding(false);
  }

  async function removeEntry(id: number) {
    await fetch(`/api/meal-plan/${id}`, { method: "DELETE" });
    await mutateEntries();
  }

  async function handleRefresh() {
    await Promise.all([mutateEntries(), mutateRecipes()]);
  }

  const totalServings = (entries ?? []).reduce((sum, e) => sum + e.targetServings, 0);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meal Plan</h1>
          <Link href="/grocery-list">
            <Button variant="outline">View Grocery List →</Button>
          </Link>
        </div>

        {/* Add recipe panel */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add a recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No recipes found.</p>
                ) : (
                  filtered.map((r) => (
                    <button
                      key={r.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted active:bg-muted transition-colors min-h-[44px] ${
                        selectedRecipeId === r.id ? "bg-muted font-medium" : ""
                      }`}
                      onClick={() => {
                        setSelectedRecipeId(r.id);
                        setServings(r.servings);
                        setSearch(r.name);
                      }}
                    >
                      {r.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({r.servings} servings)
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Servings:</label>
              <Input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-20"
              />
              <Button onClick={addEntry} disabled={!selectedRecipeId || adding} className="active:scale-95 transition-transform">
                {adding ? "Adding…" : "Add to Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current plan */}
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (entries ?? []).length === 0 ? (
          <p className="text-muted-foreground">No recipes in the plan yet.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {entries!.length} recipe{entries!.length !== 1 ? "s" : ""} · {totalServings} total servings
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries!.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-start justify-between gap-2">
                      <Link
                        href={`/recipes/${entry.recipe.id}`}
                        className="hover:underline"
                      >
                        {entry.recipe.name}
                      </Link>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0 text-lg leading-none"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      {entry.targetServings} serving{entry.targetServings !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {entry.recipe.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}
