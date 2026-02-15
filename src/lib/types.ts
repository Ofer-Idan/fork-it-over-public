export interface Ingredient {
  original: string;
  name?: string;
  quantity?: string;
  unit?: string;
  group?: string;
}

export interface Recipe {
  title: string;
  image?: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: string[];
  notes?: string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  sourceUrl: string;
}

export type ShoppingApp = "todoist" | "bring";

// Pantry types
export type PantryCategory =
  | "produce"
  | "dairy_eggs"
  | "protein"
  | "grains_pasta"
  | "canned_jarred"
  | "frozen"
  | "condiments_sauces"
  | "spices_seasonings"
  | "baking"
  | "snacks"
  | "beverages"
  | "other";

export type QuantityType = "bulk" | "countable" | "binary";

export type BulkQuantity = "full" | "half" | "low" | "out";

export type BinaryQuantity = "have" | "out";

export type StorageLocation = "pantry_shelf" | "fridge" | "freezer" | "spice_rack";

export type ItemSource = "scan" | "manual" | "shopping_list";

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  canonicalName: string;
  brand: string | null;
  category: PantryCategory;
  storageLocation: StorageLocation;
  quantityType: QuantityType;
  quantity: number | null;
  unit: string | null;
  bulkQuantity: BulkQuantity | null;
  binaryQuantity: BinaryQuantity | null;
  restockThreshold: number | null;
  ingredientId: string | null;
  source: ItemSource;
  notes: string | null;
  lastUpdated: string;
  createdAt: string;
}

export interface PantryItemInput {
  name: string;
  canonicalName: string;
  category: PantryCategory;
  quantityType: QuantityType;
  storageLocation?: StorageLocation;
  brand?: string | null;
  quantity?: number | null;
  unit?: string | null;
  bulkQuantity?: BulkQuantity | null;
  binaryQuantity?: BinaryQuantity | null;
  restockThreshold?: number | null;
  source?: ItemSource;
  notes?: string | null;
}

export interface DeductionMatch {
  pantryItemId: string | null;
  pantryItemName: string;
  recipeIngredient: string;
  ingredientQuantity?: string | null;
  ingredientUnit?: string | null;
  action: "deduct" | "reduce_bulk" | "set_binary_out" | "no_match";
  deductQuantity?: number;
  newBulkQuantity?: BulkQuantity;
}

export interface ConfirmedDeduction {
  pantryItemId: string;
  action: "deduct" | "reduce_bulk" | "set_binary_out";
  deductQuantity?: number;
  newBulkQuantity?: BulkQuantity;
}

export interface SendToShoppingListRequest {
  ingredients: string[];
  app: ShoppingApp;
  listId?: string;
}
