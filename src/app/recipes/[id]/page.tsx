"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Recipe, ShoppingListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Minus, MoreHorizontal, Plus } from "lucide-react";
import { fetcher, noCacheFetcher } from "@/lib/fetcher";
import { haptic } from "@/lib/haptics";
import BottomSheet from "@/components/BottomSheet";
import ActionSheet from "@/components/ActionSheet";
import RecipeForm from "@/components/RecipeForm";
import LoadingState from "@/components/LoadingState";
import StapleCheckinSheet from "@/components/StapleCheckinSheet";
import type { StapleItem } from "@/components/StapleCheckinSheet";
import { getRecipeEmoji } from "@/lib/recipe-emoji";
import { getIngredientEmoji } from "@/lib/ingredient-emoji";
import { categoryIsStaple } from "@/lib/categories";
import { useTranslations } from "next-intl";

const STEP_NUMBERS = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];

function splitInstructions(text: string): string[] {
  // Prefer double-newline paragraph splits; fall back to single-newline for older recipes
  const doubled = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (doubled.length > 1) return doubled;
  return text.split(/\n/).map((s) => s.trim()).filter(Boolean);
}

function stepLabel(i: number): string {
  return i < STEP_NUMBERS.length ? STEP_NUMBERS[i] : `(${i + 1})`;
}

export default function RecipeDetailPage() {
  const t = useTranslations("recipeDetail");
  const tCommon = useTranslations("common");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [starPopped, setStarPopped] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showPlanSheet, setShowPlanSheet] = useState(false);
  const [planServings, setPlanServings] = useState(2);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [stapleCheckinItems, setStapleCheckinItems] = useState<StapleItem[]>([]);
  const [showStapleCheckin, setShowStapleCheckin] = useState(false);

  const { data: recipe, isLoading, mutate: mutateRecipe } = useSWR<Recipe>(
    `/api/recipes/${id}`,
    fetcher,
    { revalidateIfStale: false }
  );
  const { data: shoppingListItems } = useSWR<ShoppingListItem[]>(
    "/api/shopping-list",
    noCacheFetcher
  );

  async function handleToggleFavourite() {
    if (!recipe) return;
    haptic();
    setStarPopped(true);
    setTimeout(() => setStarPopped(false), 200);
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
    if (!recipe) return;
    setAddingToPlan(true);
    await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: id, targetServings: planServings }),
    });
    haptic();
    setAddingToPlan(false);
    setShowPlanSheet(false);

    const slNames = new Set((shoppingListItems ?? []).map((i) => i.product.name.toLowerCase()));
    const staples: StapleItem[] = recipe.ingredients
      .filter((ing) => categoryIsStaple(ing.product.category))
      .filter((ing) => !slNames.has(ing.product.name.toLowerCase()))
      .map((ing) => ({
        productId: ing.product.id,
        name: ing.product.name,
        defaultQuantity: ing.product.defaultQuantity,
        defaultUnit: ing.product.defaultUnit,
      }))
      .filter((s, idx, arr) => arr.findIndex((x) => x.productId === s.productId) === idx);

    if (staples.length > 0) {
      setStapleCheckinItems(staples);
      setShowStapleCheckin(true);
    }
  }

  if (isLoading) return <LoadingState emoji="🍳" message={t("loading")} />;
  if (!recipe) return <p className="text-muted-foreground">{t("notFound")}</p>;

  const recipeEmoji = getRecipeEmoji(recipe.ingredients.map((i) => i.product.name));
  const instructionSteps = splitInstructions(recipe.instructions);

  return (
    <div className="max-w-2xl">
      {/* Header row */}
      <div className="flex items-start gap-1 mb-2 -mx-1.5">
        <Link
          href="/recipes"
          className="p-1.5 mt-0.5 rounded-lg text-muted-foreground active:bg-muted transition-colors shrink-0"
          aria-label={t("backToRecipes")}
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="flex-1 text-xl font-bold leading-snug pt-1">{recipe.name}</h1>
        <button
          onClick={handleToggleFavourite}
          className={`p-1.5 mt-0.5 shrink-0 text-xl leading-none ${starPopped ? "animate-star-pop" : ""}`}
          aria-label={recipe.favourite ? t("removeFromFavourites") : t("addToFavourites")}
        >
          {recipe.favourite ? "★" : "☆"}
        </button>
        <button
          onClick={() => setShowActionsSheet(true)}
          className="p-1.5 mt-0.5 rounded-lg active:bg-muted transition-colors shrink-0"
          aria-label={t("moreOptions")}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Emoji + meta row */}
      <div className="flex items-center gap-3 mb-3 pl-1">
        <span className="text-4xl" aria-hidden="true">{recipeEmoji}</span>
        <div>
          <p className="text-sm text-muted-foreground">
            {tCommon("servings", { count: recipe.servings })} · {tCommon("ingredients", { count: recipe.ingredients.length })}
          </p>
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {recipe.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      <section className="mb-6">
        <h2 className="font-semibold mb-3">{t("ingredients")}</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="text-sm flex items-baseline gap-2">
              <span className="text-base shrink-0" aria-hidden="true">
                {getIngredientEmoji(ing.product.name, ing.product.category ?? "other")}
              </span>
              <span className="font-medium tabular-nums shrink-0">
                {ing.quantity} {ing.unit}
              </span>
              <span>
                {ing.product.name}
                {ing.preparation ? `, ${ing.preparation}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="my-4" />

      <section className="mb-6">
        <h2 className="font-semibold mb-3">{t("instructions")}</h2>
        <ol className="space-y-3">
          {instructionSteps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="shrink-0 text-base font-semibold text-green-600 dark:text-green-400 mt-0.5">
                {stepLabel(i)}
              </span>
              <span className="whitespace-pre-wrap">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {recipe.notes && (
        <>
          <Separator className="my-4" />
          <section className="mb-6">
            <h2 className="font-semibold mb-2">{t("notes")}</h2>
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
        {t("addToMealPlan")}
      </Button>

      {/* Actions sheet (⋯ menu) */}
      <ActionSheet
        open={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        title={recipe.name}
        actions={[
          { label: t("editRecipe"), onClick: () => setShowEditSheet(true) },
          { label: t("duplicate"), onClick: handleDuplicate },
          { label: t("deleteRecipe"), onClick: () => setShowDeleteSheet(true), destructive: true },
        ]}
      />

      {/* Edit sheet */}
      <BottomSheet
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        title={t("editRecipe")}
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
        message={t("deleteConfirmMessage")}
        actions={[{ label: t("deleteRecipe"), onClick: handleDelete, destructive: true }]}
      />

      {/* Add to Meal Plan sheet */}
      <BottomSheet
        open={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        title={t("addToMealPlan")}
      >
        <div className="px-6 py-6 flex flex-col items-center gap-6">
          <p className="text-sm text-muted-foreground text-center">
            {t("howManyServings")}
          </p>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setPlanServings((s) => Math.max(1, s - 1))}
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center active:bg-muted transition-colors"
              aria-label={tCommon("cancel")}
            >
              <Minus size={18} />
            </button>
            <span className="text-3xl font-semibold tabular-nums w-10 text-center">
              {planServings}
            </span>
            <button
              onClick={() => setPlanServings((s) => s + 1)}
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center active:bg-muted transition-colors"
              aria-label={tCommon("add")}
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
              {addingToPlan ? tCommon("adding") : t("addToMealPlan")}
            </Button>
            <Button
              variant="ghost"
              className="w-full min-h-[44px]"
              onClick={() => setShowPlanSheet(false)}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Staple check-in sheet — shown after adding to meal plan */}
      <StapleCheckinSheet
        open={showStapleCheckin}
        staples={stapleCheckinItems}
        shoppingListItems={shoppingListItems ?? []}
        onDone={() => setShowStapleCheckin(false)}
        onDefer={() => {
          setShowStapleCheckin(false);
          fetch("/api/shopping-session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ needsStapleReview: true }),
          });
        }}
      />
    </div>
  );
}
