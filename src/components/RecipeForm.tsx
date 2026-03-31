"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Recipe, RecipeFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Camera, ImageIcon, Link2, Pencil } from "lucide-react";

type Props = {
  initial?: Recipe;
};

const emptyIngredient = () => ({ name: "", quantity: 0, unit: "", preparation: "" });

function importedToForm(data: Partial<RecipeFormData>): RecipeFormData {
  return {
    name: data.name ?? "",
    servings: data.servings ?? 2,
    instructions: data.instructions ?? "",
    tags: data.tags ?? [],
    favourite: data.favourite ?? false,
    notes: data.notes ?? "",
    ingredients:
      data.ingredients && data.ingredients.length > 0
        ? data.ingredients
        : [emptyIngredient()],
  };
}

export default function RecipeForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState<RecipeFormData>(
    initial
      ? { ...initial, ingredients: initial.ingredients.map((i) => ({ ...i })) }
      : importedToForm({})
  );
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);

  // Import state
  const [showActionSheet, setShowActionSheet] = useState(!isEdit);
  const [urlMode, setUrlMode] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Show manual form fields by default only when editing
  const [showManualForm, setShowManualForm] = useState(isEdit);

  // Hidden file inputs for camera and gallery
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
        setImportError(err.error ?? "Import failed");
        setImporting(false);
        return;
      }
      const data: RecipeFormData = await res.json();
      setForm(importedToForm(data));
      setTagsInput((data.tags ?? []).join(", "));
      setShowManualForm(true);
    } catch {
      setImportError("Import failed");
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
        setImportError(err.error ?? "Import failed");
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
      setImportError("Import failed");
    }
    setImporting(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowActionSheet(false);
    handleImageFile(file);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const body = { ...form, tags };
    const url = isEdit ? `/api/recipes/${initial!.id}` : "/api/recipes";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const saved = await res.json();
    router.push(`/recipes/${saved.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Hidden file inputs triggered by action sheet */}
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

      {/* Action sheet overlay */}
      {showActionSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowActionSheet(false)}
          />
          <div className="relative bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            <div className="px-4 pb-4 space-y-1">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-3 w-full px-4 py-4 rounded-xl text-left text-base active:bg-muted transition-colors min-h-[44px]"
              >
                <Camera size={20} className="text-green-600 shrink-0" />
                <span>Take Photo</span>
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-3 w-full px-4 py-4 rounded-xl text-left text-base active:bg-muted transition-colors min-h-[44px]"
              >
                <ImageIcon size={20} className="text-green-600 shrink-0" />
                <span>Choose from Library</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrlMode(true);
                  setShowActionSheet(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-4 rounded-xl text-left text-base active:bg-muted transition-colors min-h-[44px]"
              >
                <Link2 size={20} className="text-green-600 shrink-0" />
                <span>Import from URL</span>
              </button>
              <div className="my-1 border-t" />
              <button
                type="button"
                onClick={() => {
                  setShowManualForm(true);
                  setShowActionSheet(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-sm text-muted-foreground active:bg-muted transition-colors min-h-[44px]"
              >
                <Pencil size={16} className="shrink-0" />
                <span>Type manually</span>
              </button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setShowActionSheet(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Recipe" : "New Recipe"}</h1>
        {!isEdit && (
          <Button
            type="button"
            onClick={() => setShowActionSheet(true)}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import Recipe"}
          </Button>
        )}
      </div>

      {/* URL import inline panel */}
      {urlMode && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/40">
          <p className="text-sm font-medium">Import from URL</p>
          <Input
            placeholder="https://…"
            value={importValue}
            onChange={(e) => setImportValue(e.target.value)}
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleUrlImport} disabled={importing}>
              {importing ? "Importing…" : "Import"}
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
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Image import error (outside URL panel) */}
      {importError && !urlMode && (
        <p className="text-sm text-destructive">{importError}</p>
      )}

      {/* Manual form fields */}
      {showManualForm && (
        <>
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                required
                value={form.servings}
                onChange={(e) => setField("servings", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="Italian, quick, vegetarian"
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
              <Label htmlFor="favourite">Mark as favourite</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ingredients</h2>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                + Add
              </Button>
            </div>
            {form.ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_80px_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">Name</Label>
                  )}
                  <Input
                    required
                    placeholder="Flour"
                    value={ing.name}
                    onChange={(e) => setIngredient(i, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                  )}
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    required
                    placeholder="1"
                    value={ing.quantity || ""}
                    onChange={(e) =>
                      setIngredient(i, "quantity", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                  )}
                  <Input
                    placeholder="cup"
                    value={ing.unit}
                    onChange={(e) => setIngredient(i, "unit", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">Prep</Label>
                  )}
                  <Input
                    placeholder="chopped"
                    value={ing.preparation}
                    onChange={(e) => setIngredient(i, "preparation", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={i === 0 ? "mt-5" : ""}
                  onClick={() => removeIngredient(i)}
                  disabled={form.ingredients.length === 1}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              required
              rows={8}
              placeholder="Step 1: …"
              value={form.instructions}
              onChange={(e) => setField("instructions", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any tips or variations…"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Recipe"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* Prompt when manual form is hidden (new recipe only) */}
      {!showManualForm && !isEdit && !urlMode && !showActionSheet && (
        <div className="text-center py-10 space-y-4">
          <p className="text-muted-foreground">Import a recipe above, or enter it manually.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowManualForm(true)}
          >
            Enter manually
          </Button>
          <div>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
