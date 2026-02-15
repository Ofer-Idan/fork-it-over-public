import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import type { Ingredient } from "@/lib/types";
import { suggestDepletion } from "@/lib/pantry/depletion";

function getOpenAI() {
  return new OpenAI();
}

// POST /api/pantry/deduct - Match recipe ingredients to pantry items
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ingredients, multiplier = 1 } = (await request.json()) as {
      ingredients: Ingredient[];
      multiplier: number;
    };

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });
    }

    // Fetch user's pantry
    const { data: pantryItems, error: pantryError } = await supabase
      .from("pantry_items")
      .select("*")
      .eq("user_id", user.id);

    if (pantryError) {
      console.error("Error fetching pantry:", pantryError);
      return NextResponse.json({ error: "Failed to fetch pantry" }, { status: 500 });
    }

    if (!pantryItems || pantryItems.length === 0) {
      // No pantry items — return all as no_match
      const matches = ingredients.map(ing => ({
        pantryItemId: null,
        pantryItemName: "",
        recipeIngredient: ing.original,
        ingredientQuantity: ing.quantity ? String(parseFloat(ing.quantity) * multiplier) : null,
        ingredientUnit: ing.unit || null,
        action: "no_match" as const,
      }));
      return NextResponse.json({ matches });
    }

    const pantryList = pantryItems.map(p => ({
      id: p.id,
      name: p.name,
    }));

    const ingredientList = ingredients.map(ing => ({
      original: ing.original,
      name: ing.name || ing.original,
    }));

    // AI does MATCHING ONLY — no depletion logic
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4.1-nano",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Match these recipe ingredients to pantry items. For each recipe ingredient, find the best matching pantry item by name/type.

PANTRY ITEMS:
${JSON.stringify(pantryList, null, 2)}

RECIPE INGREDIENTS:
${JSON.stringify(ingredientList, null, 2)}

For each recipe ingredient, return a JSON array of objects with:
- "pantryItemId": string | null - the id of the best matching pantry item, or null if no match
- "recipeIngredientOriginal": string - the original recipe ingredient text (must match exactly)

Be generous with matching: "olive oil" matches "extra virgin olive oil", "garlic" matches "garlic cloves", etc.
Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse matching results" }, { status: 500 });
    }

    const aiMatches: { pantryItemId: string | null; recipeIngredientOriginal: string }[] = JSON.parse(jsonMatch[0]);

    // Build a map of pantry items by ID for quick lookup
    const pantryById = new Map(pantryItems.map(p => [p.id, p]));

    // For each ingredient, apply deterministic depletion
    const matches = ingredients.map(ing => {
      const aiMatch = aiMatches.find(m => m.recipeIngredientOriginal === ing.original);
      const pantryItemId = aiMatch?.pantryItemId || null;
      const pantryItem = pantryItemId ? pantryById.get(pantryItemId) : null;

      if (!pantryItem) {
        return {
          pantryItemId: null,
          pantryItemName: "",
          recipeIngredient: ing.original,
          ingredientQuantity: ing.quantity ? String(parseFloat(ing.quantity) * multiplier) : null,
          ingredientUnit: ing.unit || null,
          action: "no_match" as const,
        };
      }

      const scaledQuantity = ing.quantity ? String(parseFloat(ing.quantity) * multiplier) : null;
      const depletion = suggestDepletion(
        {
          quantityType: pantryItem.quantity_type,
          quantity: pantryItem.quantity,
          bulkQuantity: pantryItem.bulk_quantity,
          binaryQuantity: pantryItem.binary_quantity,
        },
        scaledQuantity,
        ing.unit || null,
      );

      if (depletion.action === "no_change") {
        return {
          pantryItemId: pantryItem.id,
          pantryItemName: pantryItem.name,
          recipeIngredient: ing.original,
          ingredientQuantity: scaledQuantity,
          ingredientUnit: ing.unit || null,
          action: "no_match" as const,
        };
      }

      return {
        pantryItemId: pantryItem.id,
        pantryItemName: pantryItem.name,
        recipeIngredient: ing.original,
        ingredientQuantity: scaledQuantity,
        ingredientUnit: ing.unit || null,
        action: depletion.action === "set_binary_out" ? "set_binary_out"
          : depletion.action === "reduce_bulk" ? "reduce_bulk"
          : "deduct" as const,
        deductQuantity: depletion.deductQuantity,
        newBulkQuantity: depletion.newBulkQuantity,
      };
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error matching ingredients:", error);
    return NextResponse.json({ error: "Failed to match ingredients" }, { status: 500 });
  }
}
