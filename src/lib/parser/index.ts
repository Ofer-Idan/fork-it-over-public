import he from "he";
import type { Recipe } from "../types";
import { extractFromJsonLd } from "./jsonld";
import { extractWithHeuristics, extractNotesFromHtml } from "./heuristic";

function decodeRecipeEntities(recipe: Recipe): Recipe {
  const decode = (s: string) => he.decode(s);
  return {
    ...recipe,
    title: decode(recipe.title),
    description: recipe.description ? decode(recipe.description) : undefined,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      original: decode(ing.original),
      name: ing.name ? decode(ing.name) : undefined,
    })),
    instructions: recipe.instructions.map(decode),
    notes: recipe.notes?.map(decode),
  };
}

export async function extractRecipe(url: string): Promise<Recipe> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();

  // Try JSON-LD first (most reliable)
  const jsonLdRecipe = extractFromJsonLd(html, url);
  if (jsonLdRecipe) {
    // If JSON-LD doesn't have notes, try to extract them from HTML
    if (!jsonLdRecipe.notes || jsonLdRecipe.notes.length === 0) {
      const htmlNotes = extractNotesFromHtml(html);
      if (htmlNotes.length > 0) {
        jsonLdRecipe.notes = htmlNotes;
      }
    }
    return decodeRecipeEntities(jsonLdRecipe);
  }

  // Fall back to heuristics
  const heuristicRecipe = extractWithHeuristics(html, url);
  if (heuristicRecipe) {
    return decodeRecipeEntities(heuristicRecipe);
  }

  throw new Error("Could not extract recipe from URL");
}
