"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GroceryItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroceryListPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [checkedIndexes, setCheckedIndexes] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    router.refresh();
    fetch("/api/grocery-list", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatItem(item: GroceryItem): string {
    const qty = item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(1);
    return item.unit ? `${qty} ${item.unit} ${item.name}` : `${qty}× ${item.name}`;
  }

  function toPlainText(): string {
    return items.map(formatItem).join("\n");
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

  function toggleItem(index: number) {
    setCheckedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function exitShoppingMode() {
    setShoppingMode(false);
    setCheckedIndexes(new Set());
  }

  const uncheckedItems = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !checkedIndexes.has(i));
  const checkedItems = items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => checkedIndexes.has(i));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Grocery List</h1>
        {!loading && items.length > 0 && !shoppingMode && (
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
        {!shoppingMode && (items.length === 0 || loading) && (
          <Link href="/meal-plan">
            <Button variant="outline" className="active:scale-95 transition-transform">
              ← Meal Plan
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">
          No items yet.{" "}
          <Link href="/meal-plan" className="underline">
            Add recipes to your meal plan
          </Link>{" "}
          first.
        </p>
      ) : shoppingMode ? (
        <div className="space-y-4">
          {/* Unchecked items */}
          {uncheckedItems.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <ul className="divide-y">
                  {uncheckedItems.map(({ item, i }) => (
                    <li key={i}>
                      <button
                        className="w-full flex items-baseline gap-2 py-3 text-left min-h-[44px] active:bg-muted transition-colors"
                        onClick={() => toggleItem(i)}
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
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* In Trolley section */}
          {checkedItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                In Trolley
              </p>
              <Card>
                <CardContent className="pt-4">
                  <ul className="divide-y">
                    {checkedItems.map(({ item, i }) => (
                      <li key={i}>
                        <button
                          className="w-full flex items-baseline gap-2 py-3 text-left min-h-[44px] active:bg-muted transition-colors"
                          onClick={() => toggleItem(i)}
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
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {items.map((item, i) => (
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
        </>
      )}
    </div>
  );
}
