import type { BulkQuantity, PantryItem } from "@/lib/types";

/**
 * Determines if a recipe quantity is "small" (pinch, dash, tsp, ≤1 tbsp, garnish, to taste).
 */
export function isSmallAmount(quantity: string | null | undefined, unit: string | null | undefined): boolean {
  if (!quantity && !unit) return false;
  const text = `${quantity ?? ""} ${unit ?? ""}`.toLowerCase().trim();

  // "to taste", "garnish", "as needed"
  if (/to taste|garnish|as needed|optional/i.test(text)) return true;

  // pinch, dash
  if (/pinch|dash/i.test(text)) return true;

  // teaspoon amounts
  if (/tsp|teaspoon/i.test(text)) return true;

  // ≤1 tablespoon
  if (/tbsp|tablespoon/i.test(text)) {
    const num = parseFloat(quantity || "1");
    return num <= 1;
  }

  return false;
}

type AmountSize = "small" | "moderate";

/**
 * Bulk depletion table: current level × amount size → new level
 */
const BULK_DEPLETION_TABLE: Record<BulkQuantity, Record<AmountSize, BulkQuantity>> = {
  full: { small: "full", moderate: "half" },
  half: { small: "half", moderate: "low" },
  low:  { small: "low",  moderate: "out" },
  out:  { small: "out",  moderate: "out" },
};

export interface DepletionSuggestion {
  action: "deduct" | "reduce_bulk" | "set_binary_out" | "no_change";
  deductQuantity?: number;
  newBulkQuantity?: BulkQuantity;
}

/**
 * Given a pantry item and recipe ingredient quantity info, compute the deterministic depletion.
 */
export function suggestDepletion(
  item: { quantityType: string; quantity?: number | null; bulkQuantity?: BulkQuantity | null; binaryQuantity?: string | null },
  ingredientQuantity: string | null | undefined,
  ingredientUnit: string | null | undefined,
): DepletionSuggestion {
  // Binary items: always set to "out" after use
  if (item.quantityType === "binary") {
    if (item.binaryQuantity === "out") {
      return { action: "no_change" };
    }
    return { action: "set_binary_out" };
  }

  // Countable items: subtract the parsed count
  if (item.quantityType === "countable") {
    const amount = parseFloat(ingredientQuantity || "1");
    const deductQty = isNaN(amount) || amount <= 0 ? 1 : amount;
    const currentQty = item.quantity ?? 0;
    if (currentQty <= 0) {
      return { action: "no_change" };
    }
    return { action: "deduct", deductQuantity: deductQty };
  }

  // Bulk items: use the depletion table
  if (item.quantityType === "bulk") {
    const currentLevel = item.bulkQuantity || "full";
    if (currentLevel === "out") {
      return { action: "no_change" };
    }
    const amountSize: AmountSize = isSmallAmount(ingredientQuantity, ingredientUnit) ? "small" : "moderate";
    const newLevel = BULK_DEPLETION_TABLE[currentLevel][amountSize];
    if (newLevel === currentLevel) {
      return { action: "no_change" };
    }
    return { action: "reduce_bulk", newBulkQuantity: newLevel };
  }

  return { action: "no_change" };
}
