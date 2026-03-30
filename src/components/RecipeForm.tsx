"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Recipe, RecipeFormData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

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
    ingredients: data.ingredients && data.ingredients.length > 0
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
  const [importMode, setImportMode] = useState<"none" | "text" | "url" | "image">("none");
  const [importValue, setImportValue] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

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

  async function handleImport() {
    setImporting(true);
    setImportError("");
    try {
      let res: Response;
      if (importMode === "text") {
        res = await fetch("/api/recipes/import/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: importValue }),
        });
      } else if (importMode === "url") {
        res = await fetch("/api/recipes/import/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: importValue }),
        });
      } else if (importMode === "image" && importFile) {
        const fd = new FormData();
        fd.append("image", importFile);
        res = await fetch("/api/recipes/import/image", { method: "POST", body: fd });
      } else {
        setImporting(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setImportError(err.error ?? "Import failed");
        setImporting(false);
        return;
      }
      const data: RecipeFormData = await res.json();
      setForm(importedToForm(data));
      setTagsInput((data.tags ?? []).join(", "));
      setImportMode("none");
      setImportValue("");
      setImportFile(null);
    } catch {
      setImportError("Import failed");
    }
    setImporting(false);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? "Edit Recipe" : "New Recipe"}</h1>
        <div className="flex gap-2">
          {(["text", "url", "image"] as const).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={importMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => setImportMode(importMode === mode ? "none" : mode)}
            >
              Import from {mode}
            </Button>
          ))}
        </div>
      </div>

      {importMode !== "none" && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/40">
          <p className="text-sm font-medium">Import from {importMode}</p>
          {importMode === "text" && (
            <Textarea
              placeholder="Paste recipe text here…"
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              rows={5}
            />
          )}
          {importMode === "url" && (
            <Input
              placeholder="https://…"
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
            />
          )}
          {importMode === "image" && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          )}
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : "Import"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setImportMode("none"); setImportError(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

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
              {i === 0 && <Label className="text-xs text-muted-foreground">Name</Label>}
              <Input
                required
                placeholder="Flour"
                value={ing.name}
                onChange={(e) => setIngredient(i, "name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
              <Input
                type="number"
                min={0}
                step="any"
                required
                placeholder="1"
                value={ing.quantity || ""}
                onChange={(e) => setIngredient(i, "quantity", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs text-muted-foreground">Unit</Label>}
              <Input
                placeholder="cup"
                value={ing.unit}
                onChange={(e) => setIngredient(i, "unit", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              {i === 0 && <Label className="text-xs text-muted-foreground">Prep</Label>}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
