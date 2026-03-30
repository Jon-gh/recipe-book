"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [planServings, setPlanServings] = useState("");
  const [showPlanInput, setShowPlanInput] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRecipe(data);
        if (data) setPlanServings(String(data.servings));
        setLoading(false);
      });
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    setDeleting(true);
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.push("/recipes");
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/recipes/${id}/duplicate`, { method: "POST" });
    const copy = await res.json();
    router.push(`/recipes/${copy.id}`);
  }

  async function handleAddToPlan() {
    const servings = parseInt(planServings);
    if (!servings || servings < 1) return;
    setAddingToPlan(true);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: id, targetServings: servings }),
    });
    setAddingToPlan(false);
    setShowPlanInput(false);
    alert("Added to meal plan!");
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!recipe) return <p className="text-muted-foreground">Recipe not found.</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{recipe.name}</h1>
            {recipe.favourite && <span className="text-yellow-400 text-xl">★</span>}
          </div>
          <p className="text-sm text-muted-foreground">
            {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/recipes/${id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}

      <Separator className="my-4" />

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Ingredients</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="text-sm flex gap-2">
              <span className="font-medium tabular-nums">
                {ing.quantity} {ing.unit}
              </span>
              <span>{ing.name}{ing.preparation ? `, ${ing.preparation}` : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-4" />

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Instructions</h2>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{recipe.instructions}</div>
      </section>

      {recipe.notes && (
        <>
          <Separator className="my-4" />
          <section className="mb-6">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.notes}</p>
          </section>
        </>
      )}

      <Separator className="my-4" />

      <div>
        {showPlanInput ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={planServings}
              onChange={(e) => setPlanServings(e.target.value)}
              className="w-20 border rounded px-2 py-1 text-sm"
            />
            <span className="text-sm text-muted-foreground">servings</span>
            <Button size="sm" onClick={handleAddToPlan} disabled={addingToPlan}>
              {addingToPlan ? "Adding…" : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPlanInput(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowPlanInput(true)}>
            Add to Meal Plan
          </Button>
        )}
      </div>
    </div>
  );
}
