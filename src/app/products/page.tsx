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
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProductsPage() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("categories");
  const { data: products, isLoading, mutate } = useSWR<Product[]>(
    "/api/products?source=user",
    noCacheFetcher
  );

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editUnit, setEditUnit] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function openEdit(product: Product) {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditUnit(product.defaultUnit);
  }

  async function deleteProduct(id: number) {
    setDeletingId(id);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeletingId(null);
    mutate();
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
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">{tCommon("loading")}</p>
        ) : !products?.length ? (
          <p className="text-muted-foreground">
            {t("noItems")}
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
                          {tCat(product.category)}
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
                      <button
                        onClick={() => deleteProduct(product.id)}
                        aria-label={`Delete ${product.name}`}
                        disabled={deletingId === product.id}
                        className="text-muted-foreground hover:text-destructive p-1 shrink-0 disabled:opacity-40"
                      >
                        <Trash2 size={16} />
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
            disabled={!editName.trim() || saving}
          >
            {saving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
