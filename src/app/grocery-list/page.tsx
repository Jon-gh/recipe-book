"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { GroceryItem, ShoppingListItem, Product } from "@/types";
import { CATEGORIES, CATEGORY_NAMES, categoryIsStaple } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { noCacheFetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import SwipeableRow from "@/components/SwipeableRow";
import { PencilLine, Plus } from "lucide-react";

type SessionState = {
  checkedKeys: string[];
  showStaples: boolean;
};

type DisplayItem = GroceryItem & {
  shoppingListId?: number;
  productDefaultUnit?: string;
};

function itemKey(item: { name: string; unit: string; shoppingListId?: number }): string {
  if (item.shoppingListId != null) return `sl_${item.shoppingListId}`;
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
    productId: item.product.id,
    source: item.product.source,
    shoppingListId: item.id,
    productDefaultUnit: item.product.defaultUnit,
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
  const { data: sessionData, isLoading: sessionLoading, mutate: mutateSession } = useSWR<SessionState>(
    "/api/shopping-session",
    noCacheFetcher,
    { refreshInterval: 15000 }
  );

  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [showStaples, setShowStaples] = useState(false);
  const sessionSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: globalMutate } = useSWRConfig();

  // Add sheet state
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("other");

  // Edit product sheet state
  const [editingProduct, setEditingProduct] = useState<{
    id: number;
    name: string;
    category: string;
    defaultUnit: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editUnit, setEditUnit] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const isSelectedRef = useRef(false);

  const [debouncedName, setDebouncedName] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isSelectedRef.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedName(newItemName), 200);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [newItemName]);

  const { data: suggestions } = useSWR<Product[]>(
    debouncedName.trim().length >= 1
      ? `/api/products?q=${encodeURIComponent(debouncedName.trim())}`
      : null,
    noCacheFetcher
  );

  useEffect(() => {
    if (!newItemName.trim() || !suggestions?.length) return;
    const match = suggestions.find(
      (s) => s.name.toLowerCase() === newItemName.trim().toLowerCase()
    );
    if (match) {
      setNewItemCategory(match.category);
      if (match.defaultUnit) setNewItemUnit(match.defaultUnit);
      if (match.defaultQuantity !== 1) setNewItemQty(String(match.defaultQuantity));
      isSelectedRef.current = true;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setDebouncedName("");
      globalMutate(
        (key: unknown) => typeof key === "string" && key.startsWith("/api/products"),
        undefined,
        { revalidate: false }
      );
      nameInputRef.current?.blur();
    }
  }, [newItemName, suggestions]);

  const sessionInitialised = useRef(false);
  useEffect(() => {
    if (sessionLoading || !sessionData || sessionInitialised.current) return;
    sessionInitialised.current = true;
    setCheckedKeys(new Set(sessionData.checkedKeys));
    setShowStaples(sessionData.showStaples);
  }, [sessionData, sessionLoading]);

  // Pick up session changes from other users on each SWR background refresh.
  // Skip if there are local changes still pending upload (to avoid clobbering).
  useEffect(() => {
    if (!sessionInitialised.current || !sessionData) return;
    if (sessionSyncTimer.current !== null) return;
    setCheckedKeys(new Set(sessionData.checkedKeys));
    setShowStaples(sessionData.showStaples);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData]);

  const isLoading = mpLoading || slLoading || sessionLoading;

  const syncSession = useCallback(
    (keys: Set<string>, staples: boolean) => {
      if (sessionSyncTimer.current) clearTimeout(sessionSyncTimer.current);
      sessionSyncTimer.current = setTimeout(() => {
        sessionSyncTimer.current = null;
        fetch("/api/shopping-session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkedKeys: Array.from(keys), showStaples: staples }),
        });
      }, 300);
    },
    []
  );

  const mpItems: DisplayItem[] = (mealPlanItems ?? []).map((i) => ({ ...i }));
  const slItems: DisplayItem[] = (shoppingListItems ?? []).map(shoppingItemToDisplay);
  const allItems: DisplayItem[] = [...mpItems, ...slItems];

  function toggleItem(key: string) {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      syncSession(next, showStaples);
      return next;
    });
  }

  function openAddSheet() {
    setNewItemName("");
    setNewItemQty("1");
    setNewItemUnit("");
    setNewItemCategory("other");
    setShowAddSheet(true);
  }

  function openEditSheet(item: DisplayItem) {
    setEditingProduct({ id: item.productId, name: item.name, category: item.category, defaultUnit: item.productDefaultUnit ?? "" });
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.productDefaultUnit ?? "");
  }

  async function addItem() {
    const name = newItemName.trim();
    if (!name) return;
    setShowAddSheet(false);
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: parseFloat(newItemQty) || 1, unit: newItemUnit, category: newItemCategory }),
    });
    mutateSl();
  }

  async function saveEdit() {
    if (!editingProduct) return;
    setEditSaving(true);
    await fetch(`/api/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, category: editCategory, defaultUnit: editUnit }),
    });
    setEditSaving(false);
    setEditingProduct(null);
    mutateSl();
    mutateMp();
  }

  async function removeShoppingItem(id: number) {
    await fetch(`/api/shopping-list/${id}`, { method: "DELETE" });
    mutateSl();
  }

  async function clearChecked() {
    const checkedSlItems = slItems.filter((i) => checkedKeys.has(itemKey(i)));
    await Promise.all(
      checkedSlItems.map((i) =>
        fetch(`/api/shopping-list/${i.shoppingListId}`, { method: "DELETE" })
      )
    );
    if (checkedSlItems.length > 0) mutateSl();
    setCheckedKeys(new Set());
    syncSession(new Set(), showStaples);
  }

  async function handleRefresh() {
    await Promise.all([mutateMp(), mutateSl(), mutateSession()]);
  }

  const uncheckedItems = allItems.filter((item) => !checkedKeys.has(itemKey(item)));
  const checkedItems = allItems.filter((item) => checkedKeys.has(itemKey(item)));
  const totalCount = allItems.length;
  const stapleCount = allItems.filter((i) => categoryIsStaple(i.category) && i.shoppingListId == null).length;

  const visibleUncheckedGroups = groupByCategory(uncheckedItems)
    .map((g) => ({
      ...g,
      items: showStaples || !g.isStaple ? g.items : g.items.filter((i) => i.shoppingListId != null),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Grocery List</h1>
          <div className="flex items-center gap-2">
            <Link href="/products" aria-label="Manage my items">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
                <PencilLine size={18} />
              </Button>
            </Link>
            {checkedItems.length > 0 && (
              <Button
                variant="outline"
                className="active:scale-95 transition-transform"
                onClick={clearChecked}
              >
                Clear
              </Button>
            )}
            {!isLoading && totalCount === 0 && (
              <Link href="/meal-plan">
                <Button variant="outline" className="active:scale-95 transition-transform">
                  ← Meal Plan
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {totalCount > 0 && stapleCount > 0 && (
              <button
                className="text-sm text-muted-foreground underline-offset-2 underline"
                onClick={() => { const next = !showStaples; setShowStaples(next); syncSession(checkedKeys, next); }}
              >
                {showStaples ? "Hide staples" : `Show staples (${stapleCount})`}
              </button>
            )}

            {totalCount === 0 && (
              <p className="text-muted-foreground">
                No meal plan items yet.{" "}
                <Link href="/meal-plan" className="underline">
                  Add recipes to your meal plan
                </Link>{" "}
                to get started, or tap + to add extras.
              </p>
            )}

            {visibleUncheckedGroups.map(({ category, items: catItems }) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {category}
                </p>
                <Card>
                  <CardContent className="pt-4">
                    <ul className="divide-y">
                      {catItems.map((item) => {
                        const key = itemKey(item);
                        const isUserProduct = item.source === "user" && item.shoppingListId != null;
                        const row = (
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
                        return isUserProduct ? (
                          <SwipeableRow key={key} onEdit={() => openEditSheet(item)}>
                            {row}
                          </SwipeableRow>
                        ) : row;
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
        )}
      </div>
    </PullToRefresh>

    <button
      onClick={openAddSheet}
      aria-label="Add to shopping list"
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>

    {/* Add item sheet */}
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
            onChange={(e) => { isSelectedRef.current = false; setNewItemName(e.target.value); }}
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
              onChange={(e) => setNewItemQty(e.target.value)}
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

    {/* Edit product sheet */}
    <BottomSheet
      open={editingProduct !== null}
      onClose={() => setEditingProduct(null)}
      title="Edit Item"
    >
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Category</label>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {CATEGORY_NAMES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Default unit</label>
          <Input
            placeholder="g, ml, tbsp…"
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
          />
        </div>
        <Button
          className="w-full"
          onClick={saveEdit}
          disabled={!editName.trim() || editSaving}
        >
          {editSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </BottomSheet>
    </>
  );
}
