"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Recipe } from "@/types";
import RecipeForm from "@/components/RecipeForm";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRecipe(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!recipe) return <p className="text-muted-foreground">Recipe not found.</p>;

  return <RecipeForm initial={recipe} />;
}
