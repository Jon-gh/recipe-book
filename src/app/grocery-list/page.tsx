"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { GroceryItem, ShoppingListItem, Product } from "@/types";
import { CATEGORIES, CATEGORY_NAMES, categoryIsStaple } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { noCacheFetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import { Plus } from "lucide-react";

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
    name: item.product.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.product.category,
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

  // Add item sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("other");

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Debounce the autocomplete query so fetches don't fire on every keystroke
  const [debouncedName, setDebouncedName] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedName(newItemName), 200);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [newItemName]);

  // Autocomplete suggestions from existing products
  const { data: suggestions } = useSWR<Product[]>(
    debouncedName.trim().length >= 1
      ? `/api/products?q=${encodeURIComponent(debouncedName.trim())}`
      : null,
    noCacheFetcher
  );

  // Auto-fill category, unit, and quantity when the typed name exactly matches a known product
  useEffect(() => {
    if (!newItemName.trim() || !suggestions?.length) return;
    const match = suggestions.find(
      (s) => s.name.toLowerCase() === newItemName.trim().toLowerCase()
    );
    if (match) {
      setNewItemCategory(match.category);
      if (match.defaultUnit) setNewItemUnit(match.defaultUnit);
      if (match.defaultQuantity !== 1) setNewItemQty(match.defaultQuantity);
      setDebouncedName("");
      nameInputRef.current?.blur();
    }
  }, [newItemName, suggestions]);

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

  function openAddSheet() {
    setNewItemName("");
    setNewItemQty(1);
    setNewItemUnit("");
    setNewItemCategory("other");
    setShowAddSheet(true);
  }

  async function addItem() {
    const name = newItemName.trim();
    if (!name) return;
    setShowAddSheet(false);
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: newItemQty, unit: newItemUnit, category: newItemCategory }),
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

  async function handleRefresh() {
    await Promise.all([mutateMp(), mutateSl()]);
  }

  const uncheckedItems = allItems.filter((item) => !checkedKeys.has(itemKey(item)));
  const checkedItems = allItems.filter((item) => checkedKeys.has(itemKey(item)));

  const visibleGroups = groupByCategory(uncheckedItems).filter(
    (g) => showStaples || !g.isStaple
  );

  const totalCount = allItems.length;
  const stapleCount = allItems.filter((i) => categoryIsStaple(i.category)).length;

  return (
    <>
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
                to get started, or tap + to add extras.
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
          </>
        )}
      </div>
    </PullToRefresh>

    {/* FAB — outside PullToRefresh so CSS transform doesn't break position:fixed */}
    <button
      onClick={openAddSheet}
      aria-label="Add to shopping list"
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>

    <BottomSheet
      open={showAddSheet}
      onClose={() => setShowAddSheet(false)}
      title="Add to Shopping List"
    >
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="space-y-1">
          <label className="text-sm font-medium">Item</label>
          <Input
            ref={nameInputRef}
            list="ingredient-suggestions"
            placeholder="e.g. butter, oat milk…"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            autoFocus
          />
          <datalist id="ingredient-suggestions">
            {(suggestions ?? []).map((ing) => (
              <option key={ing.id} value={ing.name} />
            ))}
          </datalist>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min={0}
              step="any"
              value={newItemQty}
              onChange={(e) => setNewItemQty(Number(e.target.value))}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Unit</label>
            <Input
              placeholder="g, ml, tbsp…"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Category</label>
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {CATEGORY_NAMES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="w-full"
          onClick={addItem}
          disabled={!newItemName.trim()}
        >
          Add to List
        </Button>
      </div>
    </BottomSheet>
    </>
  );
}
