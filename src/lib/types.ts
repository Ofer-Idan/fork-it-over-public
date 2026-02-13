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

export interface SendToShoppingListRequest {
  ingredients: string[];
  app: ShoppingApp;
  listId?: string;
}
