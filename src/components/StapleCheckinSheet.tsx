"use client";

import { useState } from "react";
import { RecipeIngredient, ShoppingListItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomSheet from "@/components/BottomSheet";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export type StapleItem = Pick<RecipeIngredient, "productId"> & {
  name: string;
  defaultQuantity: number;
  defaultUnit: string;
};

type RowState = { qty: string; unit: string; added: boolean };

type Props = {
  open: boolean;
  staples: StapleItem[];
  shoppingListItems: ShoppingListItem[];
  onDone: () => void;
  onDefer: () => void;
};

export default function StapleCheckinSheet({
  open,
  staples,
  shoppingListItems,
  onDone,
  onDefer,
}: Props) {
  const t = useTranslations("stapleCheckin");

  const shoppingListNames = new Set(
    shoppingListItems.map((i) => i.product.name.toLowerCase())
  );

  const pending = staples.filter(
    (s) => !shoppingListNames.has(s.name.toLowerCase())
  );

  const [rows, setRows] = useState<Record<number, RowState>>({});

  function rowFor(s: StapleItem): RowState {
    return (
      rows[s.productId] ?? {
        qty: s.defaultQuantity > 0 ? String(s.defaultQuantity) : "1",
        unit: s.defaultUnit,
        added: false,
      }
    );
  }

  function setRow(s: StapleItem, patch: Partial<RowState>) {
    setRows((prev) => ({
      ...prev,
      [s.productId]: { ...rowFor(s), ...patch },
    }));
  }

  async function addItem(s: StapleItem) {
    const row = rowFor(s);
    setRow(s, { added: true }); // optimistic — hide immediately
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: s.name,
        quantity: parseFloat(row.qty) || 1,
        unit: row.unit,
      }),
    });
  }

  const visiblePending = pending.filter((s) => !rowFor(s).added);
  const allAdded = pending.length > 0 && visiblePending.length === 0;

  return (
    <BottomSheet open={open} onClose={onDone} title={t("title")}>
      <div className="px-4 py-4 pb-8 space-y-4">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>

        {pending.length === 0 || allAdded ? (
          <p className="text-sm text-center text-muted-foreground py-4">
            {t("allCovered")}
          </p>
        ) : (
          <ul className="space-y-3">
            {visiblePending.map((s) => {
              const row = rowFor(s);
              return (
                <li key={s.productId} className="flex items-center gap-2">
                  <span className="flex-1 font-medium text-sm">{s.name}</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={row.qty}
                    onChange={(e) =>
                      setRow(s, { qty: e.target.value })
                    }
                    className="w-16 text-center"
                    aria-label={t("quantityLabel")}
                  />
                  <Input
                    value={row.unit}
                    onChange={(e) =>
                      setRow(s, { unit: e.target.value })
                    }
                    placeholder={t("unitPlaceholder")}
                    className="w-20"
                    aria-label={t("unitLabel")}
                  />
                  <button
                    onClick={() => addItem(s)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    aria-label={t("addLabel", { name: s.name })}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button className="w-full" onClick={onDone}>
            {t("done")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onDefer}>
            {t("reviewLater")}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
