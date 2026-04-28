"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Product } from "@/types";
import { CATEGORY_NAMES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { noCacheFetcher } from "@/lib/fetcher";
import BottomSheet from "@/components/BottomSheet";
import { ChevronLeft, Pencil } from "lucide-react";

export default function ProductsPage() {
  const { data: products, isLoading, mutate } = useSWR<Product[]>(
    "/api/products?source=user",
    noCacheFetcher
  );

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editUnit, setEditUnit] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(product: Product) {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditUnit(product.defaultUnit);
  }

  async function saveEdit() {
    if (!editingProduct) return;
    setSaving(true);
    await fetch(`/api/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, category: editCategory, defaultUnit: editUnit }),
    });
    setSaving(false);
    setEditingProduct(null);
    mutate();
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link href="/grocery-list">
            <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9 -ml-2">
              <ChevronLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">My Items</h1>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !products?.length ? (
          <p className="text-muted-foreground">
            No personal items yet. Add items to your shopping list and they will appear here.
          </p>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <ul className="divide-y">
                {products.map((product) => (
                  <li key={product.id}>
                    <div className="flex items-center gap-2 py-3 min-h-[44px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.category}
                          {product.defaultUnit ? ` · ${product.defaultUnit}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => openEdit(product)}
                        aria-label={`Edit ${product.name}`}
                        className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

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
            disabled={!editName.trim() || saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
