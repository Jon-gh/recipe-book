"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { Recipe, RecipeFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Camera, ImageIcon, Link2, Pencil } from "lucide-react";
import { CATEGORY_NAMES } from "@/lib/categories";
import { useTranslations } from "next-intl";

type Props = {
  initial?: Recipe;
  onClose?: () => void;
};

const emptyIngredient = () => ({ name: "", quantity: 0, unit: "", preparation: "", category: "other" });

function importedToForm(data: Partial<RecipeFormData>): RecipeFormData {
  return {
    name: data.name ?? "",
    servings: data.servings ?? 2,
    instructions: data.instructions ?? "",
    tags: data.tags ?? [],
    favourite: data.favourite ?? false,
    notes: data.notes ?? "",
    nativeLocale: data.nativeLocale,
    ingredients:
      data.ingredients && data.ingredients.length > 0
        ? data.ingredients.map((i) => ({ ...i, category: i.category ?? "other" }))
        : [emptyIngredient()],
  };
}

async function resizeImage(file: File): Promise<File> {
  const MAX = 1200;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width <= MAX && height <= MAX) {
        resolve(file);
        return;
      }
      const scale = MAX / Math.max(width, height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], "photo.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        0.85
      );
    };
    img.src = url;
  });
}

export default function RecipeForm({ initial, onClose }: Props) {
  const t = useTranslations("recipeForm");
  const tCat = useTranslations("categories");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState<RecipeFormData>(
    initial
      ? {
          ...initial,
          ingredients: initial.ingredients.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            unit: i.unit,
            preparation: i.preparation,
            category: i.product.category,
          })),
        }
      : importedToForm({})
  );
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  const [urlMode, setUrlMode] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  const [showManualForm, setShowManualForm] = useState(isEdit);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setIngredient(index: number, key: string, value: string | number) {
    setForm((f) => {
      const ings = [...f.ingredients];
      ings[index] = { ...ings[index], [key]: value };
      return { ...f, ingredients: ings };
    });
  }

  function addIngredient() {
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, emptyIngredient()] }));
  }

  function removeIngredient(index: number) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, i) => i !== index),
    }));
  }

  async function handleImageFile(file: File) {
    setImporting(true);
    setImportError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/recipes/import/image", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setImportError(err.error ?? t("importFailed"));
        setImporting(false);
        return;
      }
      const data: RecipeFormData = await res.json();
      setForm(importedToForm(data));
      setTagsInput((data.tags ?? []).join(", "));
      setShowManualForm(true);
    } catch {
      setImportError(t("importFailed"));
    }
    setImporting(false);
  }

  async function handleUrlImport() {
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/recipes/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importValue }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setImportError(err.error ?? t("importFailed"));
        setImporting(false);
        return;
      }
      const data: RecipeFormData = await res.json();
      setForm(importedToForm(data));
      setTagsInput((data.tags ?? []).join(", "));
      setUrlMode(false);
      setImportValue("");
      setShowManualForm(true);
    } catch {
      setImportError(t("importFailed"));
    }
    setImporting(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const resized = await resizeImage(file);
    handleImageFile(resized);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const body = { ...form, tags, servings: form.servings || 1 };
    const url = isEdit ? `/api/recipes/${initial!.id}` : "/api/recipes";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const saved = await res.json();
    mutate(`/api/recipes/${saved.id}`, saved, { revalidate: false });
    mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/recipes?"), undefined, { revalidate: true });
    if (isEdit && onClose) {
      onClose();
    } else {
      router.push(`/recipes/${saved.id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Header */}
      <h1 className="text-2xl font-bold">{isEdit ? t("editRecipe") : t("newRecipe")}</h1>

      {/* URL import inline panel */}
      {urlMode && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/40">
          <p className="text-sm font-medium">{t("importFromUrl")}</p>
          <Input
            placeholder="https://…"
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleUrlImport} disabled={importing}>
              {importing ? t("importing") : t("import")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setUrlMode(false);
                setImportError("");
                setImportValue("");
              }}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Manual form fields */}
      {showManualForm && (
        <>
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="servings">{t("servingsLabel")}</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                required
                value={form.servings || ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value);
                  setField("servings", isNaN(n) ? 0 : n);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tags">{t("tagsLabel")}</Label>
              <Input
                id="tags"
                placeholder={t("tagsPlaceholder")}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                id="favourite"
                type="checkbox"
                checked={form.favourite}
                onChange={(e) => setField("favourite", e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="favourite">{t("markAsFavourite")}</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t("ingredientsHeading")}</h2>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                {t("addIngredient")}
              </Button>
            </div>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="rounded-xl border bg-muted/30 p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    required
                    placeholder={t("ingredientNamePlaceholder")}
                    value={ing.name}
                    onChange={(e) => setIngredient(i, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeIngredient(i)}
                    disabled={form.ingredients.length === 1}
                    className="shrink-0 text-muted-foreground"
                  >
                    ✕
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    required
                    placeholder={t("qtyPlaceholder")}
                    value={ing.quantity || ""}
                    onChange={(e) =>
                      setIngredient(i, "quantity", parseFloat(e.target.value) || 0)
                    }
                    className="w-16"
                  />
                  <Input
                    placeholder={t("unitPlaceholder")}
                    value={ing.unit}
                    onChange={(e) => setIngredient(i, "unit", e.target.value)}
                    className="w-24"
                  />
                  <Input
                    placeholder={t("prepPlaceholder")}
                    value={ing.preparation}
                    onChange={(e) => setIngredient(i, "preparation", e.target.value)}
                    className="flex-1"
                  />
                </div>
                <select
                  value={ing.category}
                  onChange={(e) => setIngredient(i, "category", e.target.value)}
                  className="w-full text-sm rounded-md border border-input bg-background px-3 py-1.5 text-foreground"
                >
                  {CATEGORY_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {tCat(name)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <Label htmlFor="instructions">{t("instructionsLabel")}</Label>
            <Textarea
              id="instructions"
              required
              rows={8}
              placeholder={t("instructionsPlaceholder")}
              value={form.instructions}
              onChange={(e) => setField("instructions", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">{t("notesLabel")}</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={t("notesPlaceholder")}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("saving") : isEdit ? t("saveChanges") : t("createRecipe")}
            </Button>
            <Button type="button" variant="outline" onClick={() => onClose ? onClose() : router.back()}>
              {tCommon("cancel")}
            </Button>
          </div>
        </>
      )}

      {/* Inline import selection (new recipe only) */}
      {!showManualForm && !isEdit && !urlMode && (
        <div className="space-y-2 pt-2">
          {importing && (
            <p className="text-sm text-muted-foreground text-center py-4">{t("importing")}</p>
          )}
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          {!importing && (
            <>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl bg-muted/50 text-left active:bg-muted transition-colors min-h-[56px]"
              >
                <Camera size={22} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("takePhoto")}</p>
                  <p className="text-xs text-muted-foreground">{t("takePhotoSub")}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl bg-muted/50 text-left active:bg-muted transition-colors min-h-[56px]"
              >
                <ImageIcon size={22} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("chooseFromLibrary")}</p>
                  <p className="text-xs text-muted-foreground">{t("chooseFromLibrarySub")}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setUrlMode(true)}
                className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl bg-muted/50 text-left active:bg-muted transition-colors min-h-[56px]"
              >
                <Link2 size={22} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("importFromUrlOption")}</p>
                  <p className="text-xs text-muted-foreground">{t("importFromUrlSub")}</p>
                </div>
              </button>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">{tCommon("or")}</span>
                <div className="flex-1 border-t" />
              </div>
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl border text-left active:bg-muted transition-colors min-h-[56px]"
              >
                <Pencil size={20} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t("typeManually")}</p>
                  <p className="text-xs text-muted-foreground">{t("typeManuallySubt")}</p>
                </div>
              </button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => onClose ? onClose() : router.back()}>
                {tCommon("cancel")}
              </Button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
