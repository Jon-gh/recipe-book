"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { GroceryItem, ShoppingListItem, Product } from "@/types";
import { CATEGORIES, CATEGORY_NAMES, categoryIsStaple, CATEGORY_EMOJI } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { noCacheFetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import LoadingState from "@/components/LoadingState";
import SwipeableRow from "@/components/SwipeableRow";
import StapleCheckinSheet from "@/components/StapleCheckinSheet";
import type { StapleItem } from "@/components/StapleCheckinSheet";
import { PencilLine, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

type SessionState = {
  checkedKeys: string[];
  needsStapleReview: boolean;
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
  const t = useTranslations("grocery");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("categories");
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
  const [needsStapleReview, setNeedsStapleReview] = useState(false);
  const [showStapleReviewSheet, setShowStapleReviewSheet] = useState(false);
  const sessionSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: globalMutate } = useSWRConfig();

  const pendingDeleteRef = useRef<{
    item: DisplayItem;
    timerId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<DisplayItem | null>(null);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("other");

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
  }, [newItemName, suggestions, globalMutate]);

  const sessionInitialised = useRef(false);
  useEffect(() => {
    if (sessionLoading || !sessionData || sessionInitialised.current) return;
    sessionInitialised.current = true;
    setCheckedKeys(new Set(sessionData.checkedKeys));
    setNeedsStapleReview(sessionData.needsStapleReview);
  }, [sessionData, sessionLoading]);

  useEffect(() => {
    if (!sessionInitialised.current || !sessionData) return;
    if (sessionSyncTimer.current !== null) return;
    setCheckedKeys(new Set(sessionData.checkedKeys));
    setNeedsStapleReview(sessionData.needsStapleReview);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData]);

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timerId);
        fetch(`/api/shopping-list/${pendingDeleteRef.current.item.shoppingListId}`, { method: "DELETE" });
      }
    };
  }, []);

  const isLoading = mpLoading || slLoading || sessionLoading;

  const syncCheckedKeys = useCallback((keys: Set<string>) => {
    if (sessionSyncTimer.current) clearTimeout(sessionSyncTimer.current);
    sessionSyncTimer.current = setTimeout(() => {
      sessionSyncTimer.current = null;
      fetch("/api/shopping-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedKeys: Array.from(keys) }),
      });
    }, 300);
  }, []);

  function setStapleReview(value: boolean) {
    setNeedsStapleReview(value);
    fetch("/api/shopping-session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needsStapleReview: value }),
    });
  }

  const mpItems: DisplayItem[] = (mealPlanItems ?? []).map((i) => ({ ...i }));
  const slItems: DisplayItem[] = (shoppingListItems ?? []).map(shoppingItemToDisplay);
  // Meal plan items in staple categories are excluded from the display —
  // they are handled at planning time via the staple check-in flow.
  const displayMpItems = mpItems.filter((i) => !categoryIsStaple(i.category));
  const allItems: DisplayItem[] = [...displayMpItems, ...slItems];

  function toggleItem(item: DisplayItem) {
    if (item.shoppingListId != null) {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timerId);
        fetch(`/api/shopping-list/${pendingDeleteRef.current.item.shoppingListId}`, { method: "DELETE" });
        pendingDeleteRef.current = null;
        setPendingDeleteItem(null);
      }

      mutateSl(
        (current?: ShoppingListItem[]) => (current ?? []).filter((i) => i.id !== item.shoppingListId),
        { revalidate: false }
      );

      const timerId = setTimeout(() => {
        fetch(`/api/shopping-list/${item.shoppingListId}`, { method: "DELETE" });
        pendingDeleteRef.current = null;
        setPendingDeleteItem(null);
        mutateSl();
      }, 10000);

      pendingDeleteRef.current = { item, timerId };
      setPendingDeleteItem(item);
      return;
    }
    const key = itemKey(item);
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      syncCheckedKeys(next);
      return next;
    });
  }

  function undoDelete() {
    if (!pendingDeleteRef.current) return;
    clearTimeout(pendingDeleteRef.current.timerId);
    pendingDeleteRef.current = null;
    setPendingDeleteItem(null);
    mutateSl();
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

  async function handleRefresh() {
    await Promise.all([mutateMp(), mutateSl(), mutateSession()]);
  }

  const totalCount = allItems.length;

  const baseVisibleGroups = groupByCategory(allItems)
    .filter((g) => g.items.length > 0);

  const baseVisibleItems = baseVisibleGroups.flatMap((g) => g.items);
  const allDone = baseVisibleItems.length > 0 && baseVisibleItems.every((i) => checkedKeys.has(itemKey(i)));

  const visibleGroups = baseVisibleGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !checkedKeys.has(itemKey(i))),
    }))
    .filter((g) => g.items.length > 0);

  // Staple items for the review check-in sheet (sourced from full meal plan, not display list)
  const stapleCheckinItems: StapleItem[] = (mealPlanItems ?? [])
    .filter((i) => categoryIsStaple(i.category))
    .map((i) => ({ productId: i.productId, name: i.name, defaultQuantity: 1, defaultUnit: "" }))
    .filter((s, idx, arr) => arr.findIndex((x) => x.productId === s.productId) === idx);

  return (
    <>
    <PullToRefresh onRefresh={handleRefresh}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <Link href="/products" aria-label="Manage my items">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
                <PencilLine size={18} />
              </Button>
            </Link>
            {!isLoading && totalCount === 0 && (
              <Link href="/meal-plan">
                <Button variant="outline" className="active:scale-95 transition-transform">
                  {t("backToMealPlan")}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingState emoji="🛒" message={t("loading")} />
        ) : (
          <div className="space-y-4">
            {needsStapleReview && stapleCheckinItems.length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm">
                <span className="font-medium">{t("stapleReviewBanner")}</span>
                <div className="flex gap-3 ml-4 shrink-0">
                  <button
                    className="font-semibold text-blue-600 dark:text-blue-400"
                    onClick={() => setShowStapleReviewSheet(true)}
                  >
                    {t("stapleReviewAction")}
                  </button>
                  <button
                    className="text-muted-foreground"
                    onClick={() => setStapleReview(false)}
                  >
                    {t("dismiss")}
                  </button>
                </div>
              </div>
            )}

            {totalCount === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-6xl">🛒</span>
                <p className="font-bold text-lg">{t("emptyTitle")}</p>
                <p className="text-sm text-muted-foreground max-w-xs">{t("emptySubtext")}</p>
                <Link
                  href="/meal-plan"
                  className="mt-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                  {t("backToMealPlan")}
                </Link>
              </div>
            )}

            {allDone && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="text-6xl">🎉</span>
                <p className="font-bold text-lg">{t("allDoneTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("allDoneSubtext")}</p>
              </div>
            )}

            {visibleGroups.map(({ category, items: catItems }) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {CATEGORY_EMOJI[category] ?? "🛒"} {tCat(category)}
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
                                onClick={() => toggleItem(item)}
                              >
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm ml-auto text-muted-foreground">
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

          </div>
        )}
      </div>
    </PullToRefresh>

    <button
      onClick={openAddSheet}
      aria-label={t("addToShoppingList")}
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-30 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>

    {/* Staple review sheet */}
    <StapleCheckinSheet
      open={showStapleReviewSheet}
      staples={stapleCheckinItems}
      shoppingListItems={shoppingListItems ?? []}
      onDone={() => { setShowStapleReviewSheet(false); setStapleReview(false); mutateSl(); }}
      onDefer={() => { setShowStapleReviewSheet(false); }}
    />

    {/* Add item sheet */}
    <BottomSheet
      open={showAddSheet}
      onClose={() => setShowAddSheet(false)}
      title={t("addToShoppingList")}
    >
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t("itemLabel")}</label>
          <Input
            ref={nameInputRef}
            list="ingredient-suggestions"
            placeholder={t("itemPlaceholder")}
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
            <label className="text-sm font-medium">{t("quantityLabel")}</label>
            <Input
              type="number"
              min={0}
              step="any"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">{tCommon("unit")}</label>
            <Input
              placeholder={tCommon("unitPlaceholder")}
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{tCommon("category")}</label>
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {CATEGORY_NAMES.map((cat) => (
              <option key={cat} value={cat}>
                {tCat(cat)}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="w-full"
          onClick={addItem}
          disabled={!newItemName.trim()}
        >
          {t("addToList")}
        </Button>
      </div>
    </BottomSheet>

    {/* Undo toast */}
    {pendingDeleteItem && (
      <div className="fixed top-[calc(env(safe-area-inset-top)+0.5rem)] left-4 right-4 z-50 flex items-center justify-between bg-foreground text-background rounded-xl px-4 py-3 shadow-lg">
        <span className="text-sm">{t("removed", { name: pendingDeleteItem.name })}</span>
        <button
          onClick={undoDelete}
          className="text-sm font-semibold ml-4 shrink-0"
        >
          {t("undo")}
        </button>
      </div>
    )}

    {/* Edit product sheet */}
    <BottomSheet
      open={editingProduct !== null}
      onClose={() => setEditingProduct(null)}
      title={t("editItem")}
    >
      <div className="px-4 py-4 space-y-4 pb-8">
        <div className="space-y-1">
          <label className="text-sm font-medium">{tCommon("name")}</label>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{tCommon("category")}</label>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          >
            {CATEGORY_NAMES.map((cat) => (
              <option key={cat} value={cat}>
                {tCat(cat)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">{tCommon("defaultUnit")}</label>
          <Input
            placeholder={tCommon("unitPlaceholder")}
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
          />
        </div>
        <Button
          className="w-full"
          onClick={saveEdit}
          disabled={!editName.trim() || editSaving}
        >
          {editSaving ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </BottomSheet>
    </>
  );
}
