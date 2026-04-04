"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroceryItem } from "@/types";
import { CATEGORIES, categoryIsStaple } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "recipe-book:shopping";

type PersistedState = {
  checkedKeys: string[];
  customItems: GroceryItem[];
  shoppingMode: boolean;
  showStaples: boolean;
};

function itemKey(item: GroceryItem): string {
  return `${item.name.toLowerCase()}__${item.unit.toLowerCase()}`;
}

function groupByCategory(
  items: GroceryItem[]
): { category: string; isStaple: boolean; items: GroceryItem[] }[] {
  const map = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const cat = item.category || "other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  const ordered: { category: string; isStaple: boolean; items: GroceryItem[] }[] = [];
  for (const { name, isStaple } of CATEGORIES) {
    if (map.has(name)) ordered.push({ category: name, isStaple, items: map.get(name)! });
  }
  // any unknown categories at the end
  Array.from(map.entries()).forEach(([cat, catItems]) => {
    if (!CATEGORIES.find((c) => c.name === cat)) {
      ordered.push({ category: cat, isStaple: false, items: catItems });
    }
  });
  return ordered;
}

export default function GroceryListPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<GroceryItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [showStaples, setShowStaples] = useState(false);
  const router = useRouter();

  // Fetch grocery list and restore persisted shopping state
  useEffect(() => {
    router.refresh();
    fetch("/api/grocery-list", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: GroceryItem[]) => {
        setItems(data);
        setLoading(false);

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const saved: PersistedState = JSON.parse(raw);
            setCheckedKeys(new Set(saved.checkedKeys));
            setCustomItems(saved.customItems ?? []);
            setShoppingMode(saved.shoppingMode ?? false);
            setShowStaples(saved.showStaples ?? false);
          }
        } catch {
          // ignore malformed localStorage
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist shopping state to localStorage whenever it changes; clear it when not shopping
  useEffect(() => {
    if (loading) return;
    if (!shoppingMode) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const state: PersistedState = {
      checkedKeys: Array.from(checkedKeys),
      customItems,
      shoppingMode,
      showStaples,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [checkedKeys, customItems, shoppingMode, showStaples, loading]);

  const allItems = [...items, ...customItems];

  function formatItem(item: GroceryItem): string {
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

  function download() {
    const blob = new Blob([toPlainText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grocery-list.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleItem(key: string) {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function addCustomItem() {
    const name = newItemName.trim();
    if (!name) return;
    setCustomItems((prev) => [...prev, { name, quantity: 1, unit: "", category: "other" }]);
    setNewItemName("");
  }

  function exitShoppingMode() {
    setShoppingMode(false);
    setCheckedKeys(new Set());
    setCustomItems([]);
  }

  const uncheckedItems = allItems.filter((item) => !checkedKeys.has(itemKey(item)));
  const checkedItems = allItems.filter((item) => checkedKeys.has(itemKey(item)));

  const visibleGroups = groupByCategory(uncheckedItems).filter(
    (g) => showStaples || !g.isStaple
  );

  const totalCount = allItems.length;
  const stapleCount = allItems.filter((i) => categoryIsStaple(i.category)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Grocery List</h1>
        {!loading && totalCount > 0 && !shoppingMode && (
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
        {!shoppingMode && (totalCount === 0 || loading) && (
          <Link href="/meal-plan">
            <Button variant="outline" className="active:scale-95 transition-transform">
              ← Meal Plan
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : totalCount === 0 ? (
        <p className="text-muted-foreground">
          No items yet.{" "}
          <Link href="/meal-plan" className="underline">
            Add recipes to your meal plan
          </Link>{" "}
          first.
        </p>
      ) : shoppingMode ? (
        <div className="space-y-4">
          {/* Staples toggle */}
          {stapleCount > 0 && (
            <button
              className="text-sm text-muted-foreground underline-offset-2 underline"
              onClick={() => setShowStaples((v) => !v)}
            >
              {showStaples ? "Hide staples" : `Show staples (${stapleCount})`}
            </button>
          )}

          {/* Unchecked items grouped by category */}
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
                          <button
                            className="w-full flex items-baseline gap-2 py-3 text-left min-h-[44px] active:bg-muted transition-colors"
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
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}

          {/* Add custom item */}
          <div className="flex gap-2">
            <Input
              placeholder="Add item…"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addCustomItem}
              disabled={!newItemName.trim()}
            >
              +
            </Button>
          </div>

          {/* In Trolley */}
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

          <div className="flex gap-2 mb-6">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="active:scale-95 transition-transform"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </Button>
            <Button
              onClick={download}
              variant="outline"
              className="active:scale-95 transition-transform"
            >
              Download .txt
            </Button>
          </div>

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
                          <li key={i} className="py-2 flex items-baseline gap-2">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground text-sm ml-auto">
                              {item.quantity % 1 === 0
                                ? item.quantity
                                : item.quantity.toFixed(1)}
                              {item.unit ? ` ${item.unit}` : ""}
                            </span>
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
  );
}
