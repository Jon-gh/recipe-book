"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Recipe } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import BottomSheet from "@/components/BottomSheet";
import ActionSheet from "@/components/ActionSheet";
import RecipeForm from "@/components/RecipeForm";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [planServings, setPlanServings] = useState(2);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: recipe, isLoading, mutate: mutateRecipe } = useSWR<Recipe>(
    `/api/recipes/${id}`,
    fetcher,
    { revalidateIfStale: false }
  );

  async function handleToggleFavourite() {
    if (!recipe) return;
    haptic();
    const updated = { ...recipe, favourite: !recipe.favourite };
    mutateRecipe(updated, false);
    await fetch(`/api/recipes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favourite: updated.favourite }),
    });
    mutate(
      (key: unknown) => typeof key === "string" && key.startsWith("/api/recipes?"),
      undefined,
      { revalidate: true }
    );
  }

  async function handleDelete() {
    haptic([10, 50, 10]);
    setDeleting(true);
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    mutate(
      (key: unknown) => typeof key === "string" && key.startsWith("/api/recipes"),
      undefined,
      { revalidate: true }
    );
    router.push("/recipes");
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/recipes/${id}/duplicate`, { method: "POST" });
    const copy = await res.json();
    mutate(`/api/recipes/${copy.id}`, copy, { revalidate: false });
    mutate(
      (key: unknown) => typeof key === "string" && key.startsWith("/api/recipes?"),
      undefined,
      { revalidate: true }
    );
    router.push(`/recipes/${copy.id}`);
  }

  async function handleAddToPlan() {
    setAddingToPlan(true);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: id, targetServings: planServings }),
    });
    haptic();
    setAddingToPlan(false);
    setShowPlanSheet(false);
  }

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!recipe) return <p className="text-muted-foreground">Recipe not found.</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{recipe.name}</h1>
            <button
              onClick={handleToggleFavourite}
              className="text-2xl leading-none active:scale-95 transition-transform"
              aria-label={recipe.favourite ? "Remove from favourites" : "Add to favourites"}
            >
              {recipe.favourite ? "★" : "☆"}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] active:scale-95 transition-transform"
            onClick={() => setShowEditSheet(true)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] active:scale-95 transition-transform"
            onClick={handleDuplicate}
          >
            Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="min-h-[44px] active:scale-95 transition-transform"
            onClick={() => setShowDeleteSheet(true)}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
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
              <span>
                {ing.ingredient.name}
                {ing.preparation ? `, ${ing.preparation}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-4" />

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Instructions</h2>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {recipe.instructions}
        </div>
      </section>

      {recipe.notes && (
        <>
          <Separator className="my-4" />
          <section className="mb-6">
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {recipe.notes}
            </p>
          </section>
        </>
      )}

      <Separator className="my-4" />

      <Button
        variant="outline"
        className="min-h-[44px] active:scale-95 transition-transform"
        onClick={() => {
          setPlanServings(recipe.servings);
          setShowPlanSheet(true);
        }}
      >
        Add to Meal Plan
      </Button>

      {/* Edit sheet */}
      <BottomSheet
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title="Edit Recipe"
      >
        <div className="px-4 pb-8">
          <RecipeForm initial={recipe} onClose={() => setShowEditSheet(false)} />
        </div>
      </BottomSheet>

      {/* Delete action sheet */}
      <ActionSheet
        open={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        title={recipe.name}
        message="This will permanently delete the recipe and remove it from any meal plans."
        actions={[{ label: "Delete Recipe", onClick: handleDelete, destructive: true }]}
      />

      {/* Add to Meal Plan sheet */}
      <BottomSheet
        open={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        title="Add to Meal Plan"
      >
        <div className="px-6 py-6 flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground text-center">
            How many servings do you need?
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setPlanServings((s) => Math.max(1, s - 1))}
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center active:bg-muted transition-colors"
              aria-label="Decrease servings"
            >
              <Minus size={18} />
            </button>
            <span className="text-3xl font-semibold tabular-nums w-10 text-center">
              {planServings}
            </span>
            <button
              onClick={() => setPlanServings((s) => s + 1)}
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center active:bg-muted transition-colors"
              aria-label="Increase servings"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="w-full flex flex-col gap-2">
            <Button
              className="w-full min-h-[44px]"
              onClick={handleAddToPlan}
              disabled={addingToPlan}
            >
              {addingToPlan ? "Adding…" : "Add to Meal Plan"}
            </Button>
            <Button
              variant="ghost"
              className="w-full min-h-[44px]"
              onClick={() => setShowPlanSheet(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
