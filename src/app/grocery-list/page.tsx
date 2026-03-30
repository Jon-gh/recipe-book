"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GroceryItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroceryListPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/grocery-list", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Grocery List</h1>
        <Link href="/meal-plan">
          <Button variant="outline">← Meal Plan</Button>
        </Link>
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
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            <Button onClick={copyToClipboard} variant="outline">
              {copied ? "Copied!" : "Copy to clipboard"}
            </Button>
            <Button onClick={download} variant="outline">
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
