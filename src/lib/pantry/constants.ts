import type { PantryCategory, QuantityType, StorageLocation } from "@/lib/types";

export const CATEGORY_LABELS: Record<PantryCategory, string> = {
  produce: "Produce",
  dairy_eggs: "Dairy & Eggs",
  protein: "Protein",
  grains_pasta: "Grains & Pasta",
  canned_jarred: "Canned & Jarred",
  frozen: "Frozen",
  condiments_sauces: "Condiments & Sauces",
  spices_seasonings: "Spices & Seasonings",
  baking: "Baking",
  snacks: "Snacks",
  beverages: "Beverages",
  other: "Other",
};

export const STORAGE_LOCATION_LABELS: Record<StorageLocation, string> = {
  pantry_shelf: "Pantry Shelf",
  fridge: "Fridge",
  freezer: "Freezer",
  spice_rack: "Spice Rack",
};

export const CATEGORIES: PantryCategory[] = [
  "produce",
  "dairy_eggs",
  "protein",
  "grains_pasta",
  "canned_jarred",
  "frozen",
  "condiments_sauces",
  "spices_seasonings",
  "baking",
  "snacks",
  "beverages",
  "other",
];

export const STORAGE_LOCATIONS: StorageLocation[] = [
  "pantry_shelf",
  "fridge",
  "freezer",
  "spice_rack",
];

/** Default quantity type for each category */
export const DEFAULT_QUANTITY_TYPES: Record<PantryCategory, QuantityType> = {
  produce: "binary",
  dairy_eggs: "countable",
  protein: "binary",
  grains_pasta: "binary",
  canned_jarred: "countable",
  frozen: "binary",
  condiments_sauces: "bulk",
  spices_seasonings: "binary",
  baking: "bulk",
  snacks: "binary",
  beverages: "countable",
  other: "binary",
};

/** Default storage location for each category */
export const DEFAULT_STORAGE_LOCATIONS: Record<PantryCategory, StorageLocation> = {
  produce: "fridge",
  dairy_eggs: "fridge",
  protein: "fridge",
  grains_pasta: "pantry_shelf",
  canned_jarred: "pantry_shelf",
  frozen: "freezer",
  condiments_sauces: "fridge",
  spices_seasonings: "spice_rack",
  baking: "pantry_shelf",
  snacks: "pantry_shelf",
  beverages: "fridge",
  other: "pantry_shelf",
};

/** Specific items that override the category default quantity type */
export const QUANTITY_TYPE_OVERRIDES: Record<string, QuantityType> = {
  eggs: "countable",
  egg: "countable",
  butter: "countable",
  yogurt: "countable",
  milk: "bulk",
  cream: "bulk",
  oil: "bulk",
  olive_oil: "bulk",
  flour: "bulk",
  sugar: "bulk",
  rice: "bulk",
  pasta: "binary",
  salt: "bulk",
  pepper: "bulk",
};
