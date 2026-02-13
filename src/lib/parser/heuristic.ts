import * as cheerio from "cheerio";
import type { Recipe, Ingredient } from "../types";
import { parseIngredient } from "./ingredients";

// Expanded selectors for finding recipe notes/tips in HTML
const NOTE_SELECTORS = [
  // Tasty Recipes plugin (common) - must check paragraph children first
  '.tasty-recipes-notes-body p',
  '.tasty-recipes-notes p',
  // Class-based selectors
  '[class*="recipe-note"] p',
  '[class*="recipe-note"] li',
  '[class*="recipe-notes"] p',
  '[class*="recipe-notes"] li',
  '[class*="recipe-tip"] p',
  '[class*="recipe-tip"] li',
  '[class*="recipe-tips"] p',
  '[class*="recipe-tips"] li',
  '[class*="wprm-recipe-note"] p',
  '[class*="wprm-recipe-note"] li',
  '[class*="mv-recipe-note"] p',
  '[class*="mv-recipe-note"] li',
  // Generic note/tip classes
  '.notes p',
  '.notes li',
  '.note p',
  '.note li',
  '.tips p',
  '.tips li',
  '.tip p',
  '.tip li',
  '.recipe-notes p',
  '.recipe-notes li',
  '.recipe-tips p',
  '.recipe-tips li',
  // ID-based
  '#notes p',
  '#notes li',
  '#recipe-notes p',
  '#recipe-notes li',
  // Data attributes
  '[data-recipe-notes]',
  '[data-notes]',
  // Section with heading containing "note" or "tip"
  'section:has(h2:contains("Note")) p',
  'section:has(h2:contains("Tip")) p',
  'section:has(h3:contains("Note")) p',
  'section:has(h3:contains("Tip")) p',
  'div:has(> h2:contains("Note")) p',
  'div:has(> h2:contains("Tip")) p',
  'div:has(> h3:contains("Note")) p',
  'div:has(> h3:contains("Tip")) p',
  // Common recipe plugin patterns
  '.wprm-recipe-notes',
  '.tasty-recipes-notes',
  '.mv-create-notes',
  '.easyrecipe .notes',
];

/**
 * Extract ingredient group names from HTML.
 * Returns one group name per ingredient, in order, so they can be
 * zipped onto the flat ingredient list from JSON-LD.
 * Returns empty array if no groups are found.
 */
export function extractIngredientGroupsFromHtml(html: string): string[] {
  const $ = cheerio.load(html);
  const groups: string[] = [];

  // Strategy: look for known recipe plugin structures that use
  // headings/labels before grouped <ul> ingredient lists.
  const strategies: (() => boolean)[] = [
    // Tasty Recipes: <p>Group Name</p> then <ul><li>...</li></ul>
    () => {
      const body = $(".tasty-recipes-ingredients-body");
      if (body.length === 0) return false;
      let found = false;
      let currentGroup = "";
      body.children().each((_, el) => {
        const tag = (el as unknown as { tagName?: string }).tagName?.toLowerCase();
        if (tag === "p" || tag === "h4" || tag === "h3") {
          const text = $(el).text().trim();
          if (text && text.length < 80) {
            currentGroup = text;
          }
        } else if (tag === "ul") {
          $(el).children("li").each(() => {
            groups.push(currentGroup);
            found = true;
          });
        }
      });
      return found && currentGroup !== "";
    },
    // WPRM (WP Recipe Maker): .wprm-recipe-ingredient-group with .wprm-recipe-group-name
    () => {
      const wprm = $(".wprm-recipe-ingredient-group");
      if (wprm.length === 0) return false;
      let found = false;
      wprm.each((_, group) => {
        const name = $(group).find(".wprm-recipe-group-name").first().text().trim();
        $(group).find("li").each(() => {
          groups.push(name);
          found = true;
        });
      });
      return found && groups.some((g) => g !== "");
    },
    // Generic: recipe ingredients container with h4/h3 subheadings
    () => {
      const container = $('[class*="ingredients"]').filter((_, el) => {
        return $(el).find("h3, h4").length > 0 && $(el).find("li").length > 0;
      }).first();
      if (container.length === 0) return false;
      let found = false;
      let currentGroup = "";
      container.children().each((_, el) => {
        const tag = (el as unknown as { tagName?: string }).tagName?.toLowerCase();
        if (tag === "h3" || tag === "h4") {
          const text = $(el).text().trim();
          if (text && text.length < 80) {
            currentGroup = text;
          }
        } else if (tag === "ul" || tag === "div") {
          $(el).find("li").each(() => {
            groups.push(currentGroup);
            found = true;
          });
        }
      });
      return found && currentGroup !== "";
    },
  ];

  for (const strategy of strategies) {
    groups.length = 0;
    if (strategy()) {
      return groups;
    }
  }

  return [];
}

export function extractNotesFromHtml(html: string): string[] {
  const $ = cheerio.load(html);
  const notes: string[] = [];
  const seenNotes = new Set<string>();

  for (const selector of NOTE_SELECTORS) {
    try {
      const items = $(selector);
      if (items.length > 0) {
        items.each((_, el) => {
          const text = $(el).text().trim();
          // Filter out empty, too short, or duplicate notes
          if (text && text.length > 15 && text.length < 1000 && !seenNotes.has(text)) {
            seenNotes.add(text);
            notes.push(text);
          }
        });
        // If we found notes with this selector, we can stop
        if (notes.length > 0) {
          break;
        }
      }
    } catch {
      // Some selectors might not work in cheerio, skip them
      continue;
    }
  }

  return notes;
}

export function extractWithHeuristics(
  html: string,
  sourceUrl: string
): Recipe | null {
  const $ = cheerio.load(html);

  // Try to find title
  const title =
    $('h1[class*="recipe"]').first().text().trim() ||
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    "Untitled Recipe";

  // Try to find image
  const image =
    $('img[class*="recipe"]').first().attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    $("article img").first().attr("src");

  // Try to find ingredients
  const ingredients: Ingredient[] = [];
  const ingredientSelectors = [
    '[class*="ingredient"] li',
    '[class*="ingredients"] li',
    '[data-ingredient]',
    'ul[class*="ingredient"] li',
    ".recipe-ingredients li",
    "#ingredients li",
  ];

  for (const selector of ingredientSelectors) {
    const items = $(selector);
    if (items.length > 0) {
      items.each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200) {
          ingredients.push(parseIngredient(text));
        }
      });
      break;
    }
  }

  // Try to find instructions
  const instructions: string[] = [];
  const instructionSelectors = [
    '[class*="instruction"] li',
    '[class*="instructions"] li',
    '[class*="direction"] li',
    '[class*="directions"] li',
    '[class*="step"] p',
    ".recipe-instructions li",
    ".recipe-directions li",
    "#instructions li",
  ];

  for (const selector of instructionSelectors) {
    const items = $(selector);
    if (items.length > 0) {
      items.each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          instructions.push(text);
        }
      });
      break;
    }
  }

  // Assign ingredient groups from HTML
  const ingredientGroups = extractIngredientGroupsFromHtml(html);
  if (ingredientGroups.length === ingredients.length) {
    ingredients.forEach((ing, i) => {
      ing.group = ingredientGroups[i] || undefined;
    });
  }

  // Try to find notes using the shared extraction function
  const notes = extractNotesFromHtml(html);

  // Only return if we found at least ingredients
  if (ingredients.length === 0) {
    return null;
  }

  return {
    title,
    image,
    ingredients,
    instructions,
    ...(notes.length > 0 && { notes }),
    sourceUrl,
  };
}
