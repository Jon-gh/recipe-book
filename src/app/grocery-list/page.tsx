"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { ShoppingListItem, Product } from "@/types";
import { CATEGORIES, CATEGORY_NAMES, CATEGORY_EMOJI } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { noCacheFetcher } from "@/lib/fetcher";
import PullToRefresh from "@/components/PullToRefresh";
import BottomSheet from "@/components/BottomSheet";
import LoadingState from "@/components/LoadingState";
import Cocotte from "@/components/cocotte/Cocotte";
import SwipeableRow from "@/components/SwipeableRow";
import { PencilLine, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

function groupByCategory(
  items: ShoppingListItem[]
): { category: string; items: ShoppingListItem[] }[] {
  const map = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const cat = item.product.category || "other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  const ordered: { category: string; items: ShoppingListItem[] }[] = [];
  for (const { name } of CATEGORIES) {
    if (map.has(name)) ordered.push({ category: name, items: map.get(name)! });
  }
  Array.from(map.entries()).forEach(([cat, catItems]) => {
    if (!CATEGORIES.find((c) => c.name === cat)) {
      ordered.push({ category: cat, items: catItems });
    }
  });
  return ordered;
}

export default function GroceryListPage() {
  const t = useTranslations("grocery");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("categories");

  const { data: shoppingListItems, isLoading, mutate: mutateSl } = useSWR<ShoppingListItem[]>(
    "/api/shopping-list",
    noCacheFetcher
  );

  const { mutate: globalMutate } = useSWRConfig();

  const pendingDeleteRef = useRef<{
    item: ShoppingListItem;
    timerId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ShoppingListItem | null>(null);
  // track whether the list ever had items this session, to show the cheer state on completion
  const [wasEverNonEmpty, setWasEverNonEmpty] = useState(false);

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

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timerId);
        fetch(`/api/shopping-list/${pendingDeleteRef.current.item.id}`, { method: "DELETE" });
      }
    };
  }, []);

  function tapItem(item: ShoppingListItem) {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timerId);
      fetch(`/api/shopping-list/${pendingDeleteRef.current.item.id}`, { method: "DELETE" });
      pendingDeleteRef.current = null;
      setPendingDeleteItem(null);
    }

    mutateSl(
      (current?: ShoppingListItem[]) => (current ?? []).filter((i) => i.id !== item.id),
      { revalidate: false }
    );

    const timerId = setTimeout(() => {
      fetch(`/api/shopping-list/${item.id}`, { method: "DELETE" });
      pendingDeleteRef.current = null;
      setPendingDeleteItem(null);
      mutateSl();
    }, 10000);

    pendingDeleteRef.current = { item, timerId };
    setPendingDeleteItem(item);
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

  function openEditSheet(item: ShoppingListItem) {
    setEditingProduct({
      id: item.product.id,
      name: item.product.name,
      category: item.product.category,
      defaultUnit: item.product.defaultUnit ?? "",
    });
    setEditName(item.product.name);
    setEditCategory(item.product.category);
    setEditUnit(item.product.defaultUnit ?? "");
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
  }

  async function handleRefresh() {
    await mutateSl();
  }

  const items = shoppingListItems ?? [];
  const visibleGroups = groupByCategory(items).filter((g) => g.items.length > 0);

  // Once items are observed for the first time, remember they existed this session
  useEffect(() => {
    if (!wasEverNonEmpty && items.length > 0) setWasEverNonEmpty(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const showAllDone = wasEverNonEmpty && items.length === 0 && !isLoading;

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
            {!isLoading && items.length === 0 && (
              <Link href="/meal-plan">
                <Button variant="outline" className="active:scale-95 transition-transform">
                  {t("backToMealPlan")}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <LoadingState message={t("loading")} />
        ) : (
          <div className="space-y-4">
            {items.length === 0 && showAllDone && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Cocotte pose="cheer" size={140} />
                <p className="font-bold text-lg">{t("allDoneTitle")}</p>
                <p className="text-sm text-muted-foreground max-w-xs">{t("allDoneSubtext")}</p>
              </div>
            )}
            {items.length === 0 && !showAllDone && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Cocotte pose="hold-basket" size={140} />
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

            {visibleGroups.map(({ category, items: catItems }) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {CATEGORY_EMOJI[category] ?? "🛒"} {tCat(category)}
                </p>
                <Card>
                  <CardContent className="pt-4">
                    <ul className="divide-y">
                      {catItems.map((item) => {
                        const isUserProduct = item.product.source === "user";
                        const row = (
                          <li key={item.id}>
                            <div className="flex items-center gap-2 py-3 min-h-[44px]">
                              <button
                                className="flex-1 flex items-baseline gap-2 text-left active:bg-muted transition-colors"
                                onClick={() => tapItem(item)}
                              >
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-sm ml-auto text-muted-foreground">
                                  {item.quantity % 1 === 0
                                    ? item.quantity
                                    : item.quantity.toFixed(1)}
                                  {item.unit ? ` ${item.unit}` : ""}
                                </span>
                              </button>
                            </div>
                          </li>
                        );
                        return isUserProduct ? (
                          <SwipeableRow key={item.id} onEdit={() => openEditSheet(item)}>
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
        <span className="text-sm">{t("removed", { name: pendingDeleteItem.product.name })}</span>
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
