"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { GroceryItem, ShoppingListItem, Ingredient } from "@/types";
import { CATEGORIES, categoryIsStaple } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { noCacheFetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";

const STORAGE_KEY = "recipe-book:shopping";

type PersistedState = {
  checkedKeys: string[];
  shoppingMode: boolean;
  showStaples: boolean;
};

// A display item is either a meal-plan item or a shopping list extra (with id for deletion)
type DisplayItem = GroceryItem & { shoppingListId?: number };

function itemKey(item: { name: string; unit: string }): string {
  return `${item.name.toLowerCase()}__${item.unit.toLowerCase()}`;
}

function groupByCategory(
  items: DisplayItem[]
): { category: string; isStaple: boolean; items: DisplayItem[] }[] {
  const map = new Map<string, DisplayItem[]>();
  for (const item of items) {
    const cat = item.category || "other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  const ordered: { category: string; isStaple: boolean; items: DisplayItem[] }[] = [];
  for (const { name, isStaple } of CATEGORIES) {
    if (map.has(name)) ordered.push({ category: name, isStaple, items: map.get(name)! });
  }
  Array.from(map.entries()).forEach(([cat, catItems]) => {
    if (!CATEGORIES.find((c) => c.name === cat)) {
      ordered.push({ category: cat, isStaple: false, items: catItems });
    }
  });
  return ordered;
}

function shoppingItemToDisplay(item: ShoppingListItem): DisplayItem {
  return {
    name: item.ingredient.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.ingredient.category,
    shoppingListId: item.id,
  };
}

export default function GroceryListPage() {
  const { data: mealPlanItems, isLoading: mpLoading, mutate: mutateMp } = useSWR<GroceryItem[]>(
    "/api/grocery-list",
    noCacheFetcher
  );
  const { data: shoppingListItems, isLoading: slLoading, mutate: mutateSl } = useSWR<ShoppingListItem[]>(
    "/api/shopping-list",
    noCacheFetcher
  );

  const [copied, setCopied] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [showStaples, setShowStaples] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  // Autocomplete suggestions from existing ingredients
  const { data: suggestions } = useSWR<Ingredient[]>(
    newItemName.trim().length >= 1
      ? `/api/ingredients?q=${encodeURIComponent(newItemName.trim())}`
      : null,
    noCacheFetcher
  );

  // Restore persisted shopping state once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: PersistedState = JSON.parse(raw);
        setCheckedKeys(new Set(saved.checkedKeys));
        setShoppingMode(saved.shoppingMode ?? false);
        setShowStaples(saved.showStaples ?? false);
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  // Persist shopping state whenever it changes; clear when not shopping
  const isLoading = mpLoading || slLoading;
  useEffect(() => {
    if (isLoading) return;
    if (!shoppingMode) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const state: PersistedState = {
      checkedKeys: Array.from(checkedKeys),
      shoppingMode,
      showStaples,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [checkedKeys, shoppingMode, showStaples, isLoading]);

  const mpItems: DisplayItem[] = (mealPlanItems ?? []).map((i) => ({ ...i }));
  const slItems: DisplayItem[] = (shoppingListItems ?? []).map(shoppingItemToDisplay);
  const allItems: DisplayItem[] = [...mpItems, ...slItems];

  function formatItem(item: DisplayItem): string {
    const qty = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(1);
    return item.unit ? `${qty} ${item.unit} ${item.name}` : `${qty}× ${item.name}`;
  }

  function toPlainText(): string {
    return allItems.map(formatItem).join("\n");
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(toPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleItem(key: string) {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function addItem() {
    const name = newItemName.trim();
    if (!name) return;
    setNewItemName("");
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: 1, unit: "" }),
    });
    mutateSl();
  }

  async function removeShoppingItem(id: number) {
    await fetch(`/api/shopping-list/${id}`, { method: "DELETE" });
    mutateSl();
  }

  async function exitShoppingMode() {
    // Delete all checked shopping list items from the DB
    const checkedSlItems = slItems.filter((i) => checkedKeys.has(itemKey(i)));
    await Promise.all(
      checkedSlItems.map((i) =>
        fetch(`/api/shopping-list/${i.shoppingListId}`, { method: "DELETE" })
      )
    );
    if (checkedSlItems.length > 0) mutateSl();
    setShoppingMode(false);
    setCheckedKeys(new Set());
  }

  function handleRefresh() {
    mutateMp();
    mutateSl();
  }

  const uncheckedItems = allItems.filter((item) => !checkedKeys.has(itemKey(item)));
  const checkedItems = allItems.filter((item) => checkedKeys.has(itemKey(item)));

  const visibleGroups = groupByCategory(uncheckedItems).filter(
    (g) => showStaples || !g.isStaple
  );

  const totalCount = allItems.length;
  const stapleCount = allItems.filter((i) => categoryIsStaple(i.category)).length;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Grocery List</h1>
          {!isLoading && !shoppingMode && totalCount > 0 && (
            <Button
              variant="default"
              className="active:scale-95 transition-transform"
              onClick={() => setShoppingMode(true)}
            >
              Start Shopping
            </Button>
          )}
          {shoppingMode && (
            <Button
              variant="outline"
              className="active:scale-95 transition-transform"
              onClick={exitShoppingMode}
            >
              Done
            </Button>
          )}
          {!shoppingMode && totalCount === 0 && !isLoading && (
            <Link href="/meal-plan">
              <Button variant="outline" className="active:scale-95 transition-transform">
                ← Meal Plan
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : shoppingMode ? (
          <div className="space-y-4">
            {stapleCount > 0 && (
              <button
                className="text-sm text-muted-foreground underline-offset-2 underline"
                onClick={() => setShowStaples((v) => !v)}
              >
                {showStaples ? "Hide staples" : `Show staples (${stapleCount})`}
              </button>
            )}

            {visibleGroups.map(({ category, items: catItems }) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {category}
                </p>
                <Card>
                  <CardContent className="pt-4">
                    <ul className="divide-y">
                      {catItems.map((item) => {
                        const key = itemKey(item);
                        return (
                          <li key={key}>
                            <div className="flex items-center gap-2 py-3 min-h-[44px]">
                              <button
                                className="flex-1 flex items-baseline gap-2 text-left active:bg-muted transition-colors"
                                onClick={() => toggleItem(key)}
                              >
                                <span className="font-medium">{item.name}</span>
                                <span className="text-muted-foreground text-sm ml-auto">
                                  {item.quantity % 1 === 0
                                    ? item.quantity
                                    : item.quantity.toFixed(1)}
                                  {item.unit ? ` ${item.unit}` : ""}
                                </span>
                              </button>
                              {item.shoppingListId !== undefined && (
                                <button
                                  className="text-muted-foreground hover:text-foreground px-1 shrink-0"
                                  onClick={() => removeShoppingItem(item.shoppingListId!)}
                                  aria-label={`Remove ${item.name}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Add item — always visible */}
            <AddItemInput
              value={newItemName}
              suggestions={suggestions ?? []}
              onChange={setNewItemName}
              onAdd={addItem}
            />

            {checkedItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  In Trolley
                </p>
                <Card>
                  <CardContent className="pt-4">
                    <ul className="divide-y">
                      {checkedItems.map((item) => {
                        const key = itemKey(item);
                        return (
                          <li key={key}>
                            <button
                              className="w-full flex items-baseline gap-2 py-3 text-left min-h-[44px] active:bg-muted transition-colors"
                              onClick={() => toggleItem(key)}
                            >
                              <span className="font-medium line-through text-muted-foreground">
                                {item.name}
                              </span>
                              <span className="text-muted-foreground text-sm ml-auto line-through">
                                {item.quantity % 1 === 0
                                  ? item.quantity
                                  : item.quantity.toFixed(1)}
                                {item.unit ? ` ${item.unit}` : ""}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <>
            {totalCount > 0 && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {totalCount} item{totalCount !== 1 ? "s" : ""}
                </p>
                {stapleCount > 0 && (
                  <button
                    className="text-sm text-muted-foreground underline-offset-2 underline"
                    onClick={() => setShowStaples((v) => !v)}
                  >
                    {showStaples ? "Hide staples" : `Show staples (${stapleCount})`}
                  </button>
                )}
              </div>
            )}

            {totalCount > 0 && (
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="active:scale-95 transition-transform"
                >
                  {copied ? "Copied!" : "Copy to clipboard"}
                </Button>
              </div>
            )}

            {totalCount === 0 && (
              <p className="text-muted-foreground mb-6">
                No meal plan items yet.{" "}
                <Link href="/meal-plan" className="underline">
                  Add recipes to your meal plan
                </Link>{" "}
                to get started, or add extras below.
              </p>
            )}

            <div className="space-y-4">
              {groupByCategory(allItems)
                .filter((g) => showStaples || !g.isStaple)
                .map(({ category, items: catItems }) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                      {category}
                    </p>
                    <Card>
                      <CardContent className="pt-4">
                        <ul className="divide-y">
                          {catItems.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 py-2 min-h-[44px]">
                              <span className="font-medium flex-1">{item.name}</span>
                              <span className="text-muted-foreground text-sm">
                                {item.quantity % 1 === 0
                                  ? item.quantity
                                  : item.quantity.toFixed(1)}
                                {item.unit ? ` ${item.unit}` : ""}
                              </span>
                              {item.shoppingListId !== undefined && (
                                <button
                                  className="text-muted-foreground hover:text-foreground px-1 shrink-0"
                                  onClick={() => removeShoppingItem(item.shoppingListId!)}
                                  aria-label={`Remove ${item.name}`}
                                >
                                  ×
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                ))}
            </div>

            {/* Add item — always visible */}
            <div className="mt-6">
              <AddItemInput
                value={newItemName}
                suggestions={suggestions ?? []}
                onChange={setNewItemName}
                onAdd={addItem}
              />
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

function AddItemInput({
  value,
  suggestions,
  onChange,
  onAdd,
}: {
  value: string;
  suggestions: Ingredient[];
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        list="ingredient-suggestions"
        placeholder="Add to shopping list…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <datalist id="ingredient-suggestions">
        {suggestions.map((ing) => (
          <option key={ing.id} value={ing.name} />
        ))}
      </datalist>
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        disabled={!value.trim()}
      >
        +
      </Button>
    </div>
  );
}
