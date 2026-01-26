import * as cheerio from "cheerio";
import type { Recipe, Ingredient } from "../types";

function parseIngredient(text: string): Ingredient {
  return {
    original: text.trim(),
  };
}

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
