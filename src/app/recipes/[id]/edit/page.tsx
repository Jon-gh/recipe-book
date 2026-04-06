"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { Recipe } from "@/types";
import RecipeForm from "@/components/RecipeForm";
import { fetcher } from "@/lib/fetcher";

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading } = useSWR<Recipe>(`/api/recipes/${id}`, fetcher);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!recipe) return <p className="text-muted-foreground">Recipe not found.</p>;

  return <RecipeForm initial={recipe} />;
}
