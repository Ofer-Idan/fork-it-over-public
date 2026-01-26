import * as cheerio from "cheerio";
import type { Recipe, Ingredient } from "../types";

interface JsonLdRecipe {
  "@type": string | string[];
  name?: string;
  image?: string | string[] | { url: string }[];
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: string[] | { "@type": string; text: string }[];
  notes?: string | string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | string[];
}

function parseIngredient(text: string): Ingredient {
  return {
    original: text.trim(),
  };
}

function parseInstructions(
  instructions: JsonLdRecipe["recipeInstructions"]
): string[] {
  if (!instructions) return [];

  if (Array.isArray(instructions)) {
    return instructions.map((inst) => {
      if (typeof inst === "string") return inst.trim();
      if (inst && typeof inst === "object" && "text" in inst)
        return inst.text.trim();
      return "";
    }).filter(Boolean);
  }

  return [];
}

function getImageUrl(
  image: JsonLdRecipe["image"]
): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) return first.url;
  }
  return undefined;
}

function isRecipeType(type: string | string[]): boolean {
  if (typeof type === "string") return type === "Recipe";
  return type.includes("Recipe");
}

function parseNotes(notes: JsonLdRecipe["notes"]): string[] {
  if (!notes) return [];
  if (typeof notes === "string") return [notes.trim()];
  return notes.map(n => n.trim()).filter(Boolean);
}

function parseDuration(duration: string | undefined): string | undefined {
  if (!duration) return undefined;

  // If it's already human-readable, return as-is
  if (!duration.startsWith('P')) return duration;

  // Parse ISO 8601 duration format (e.g., PT20M, PT1H30M, P1DT2H)
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;

  const [, days, hours, minutes, seconds] = match;
  const parts: string[] = [];

  if (days) parts.push(`${days} day${days === '1' ? '' : 's'}`);
  if (hours) parts.push(`${hours} hr${hours === '1' ? '' : 's'}`);
  if (minutes) parts.push(`${minutes} min${minutes === '1' ? '' : 's'}`);
  if (seconds && !minutes && !hours) parts.push(`${seconds} sec`);

  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function extractFromJsonLd(
  html: string,
  sourceUrl: string
): Recipe | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html();
      if (!content) continue;

      const data = JSON.parse(content);

      // Handle @graph array
      const items = data["@graph"] || [data];

      for (const item of Array.isArray(items) ? items : [items]) {
        if (item["@type"] && isRecipeType(item["@type"])) {
          const recipe = item as JsonLdRecipe;

          const notes = parseNotes(recipe.notes);
          return {
            title: recipe.name || "Untitled Recipe",
            image: getImageUrl(recipe.image),
            description: recipe.description,
            ingredients: (recipe.recipeIngredient || []).map(parseIngredient),
            instructions: parseInstructions(recipe.recipeInstructions),
            ...(notes.length > 0 && { notes }),
            prepTime: parseDuration(recipe.prepTime),
            cookTime: parseDuration(recipe.cookTime),
            totalTime: parseDuration(recipe.totalTime),
            servings:
              typeof recipe.recipeYield === "string"
                ? recipe.recipeYield
                : recipe.recipeYield?.[0],
            sourceUrl,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}
