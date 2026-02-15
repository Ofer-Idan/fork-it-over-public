import type { PantryItem } from "@/lib/types";
import { toCanonicalName } from "./canonical";

export type PantryMatchStatus = "stocked" | "low" | "out" | null;

export interface PantryMatch {
  item: PantryItem;
  status: PantryMatchStatus;
}

function isItemOut(item: PantryItem): boolean {
  if (item.quantityType === "bulk") return item.bulkQuantity === "out";
  if (item.quantityType === "binary") return item.binaryQuantity === "out";
  if (item.quantityType === "countable") return (item.quantity ?? 0) === 0;
  return false;
}

function isItemLow(item: PantryItem): boolean {
  if (item.quantityType === "bulk") return item.bulkQuantity === "low";
  if (item.quantityType === "countable" && item.restockThreshold != null) {
    return (item.quantity ?? 0) > 0 && (item.quantity ?? 0) <= item.restockThreshold;
  }
  return false;
}

function getItemStatus(item: PantryItem): PantryMatchStatus {
  if (isItemOut(item)) return "out";
  if (isItemLow(item)) return "low";
  return "stocked";
}

export function matchIngredientToPantry(
  ingredientName: string,
  pantryItems: PantryItem[],
): PantryMatch | null {
  const canonical = toCanonicalName(ingredientName);
  if (!canonical) return null;

  // Exact canonical match
  const exact = pantryItems.find(p => p.canonicalName === canonical);
  if (exact) return { item: exact, status: getItemStatus(exact) };

  // Substring match: pantry canonical contains ingredient canonical or vice versa
  const substringMatch = pantryItems.find(p =>
    p.canonicalName.includes(canonical) || canonical.includes(p.canonicalName)
  );
  if (substringMatch) return { item: substringMatch, status: getItemStatus(substringMatch) };

  // Word overlap: check if key words match
  const canonicalWords = canonical.split("_").filter(w => w.length > 2);
  if (canonicalWords.length === 0) return null;

  let bestMatch: PantryItem | null = null;
  let bestOverlap = 0;

  for (const p of pantryItems) {
    const pWords = p.canonicalName.split("_").filter(w => w.length > 2);
    const overlap = canonicalWords.filter(w => pWords.includes(w)).length;
    if (overlap > bestOverlap && overlap >= Math.min(canonicalWords.length, pWords.length)) {
      bestOverlap = overlap;
      bestMatch = p;
    }
  }

  if (bestMatch) return { item: bestMatch, status: getItemStatus(bestMatch) };

  return null;
}
