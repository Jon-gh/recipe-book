"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [filterFavourite, setFilterFavourite] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterFavourite) params.set("favourite", "true");
    const res = await fetch(`/api/recipes?${params}`);
    const data = await res.json();
    setRecipes(data);
    setLoading(false);
  }, [search, filterFavourite]);

  useEffect(() => {
    const t = setTimeout(fetchRecipes, 300);
    return () => clearTimeout(t);
  }, [fetchRecipes]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recipes</h1>
        <Link href="/recipes/new">
          <Button>+ Add Recipe</Button>
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Search by name, tag or ingredient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={filterFavourite ? "default" : "outline"}
          onClick={() => setFilterFavourite((f) => !f)}
        >
          ★ Favourites
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : recipes.length === 0 ? (
        <p className="text-muted-foreground">
          No recipes found.{" "}
          <Link href="/recipes/new" className="underline">
            Add one!
          </Link>
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span>{recipe.name}</span>
                    {recipe.favourite && <span className="text-yellow-400 shrink-0">★</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""} ·{" "}
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
