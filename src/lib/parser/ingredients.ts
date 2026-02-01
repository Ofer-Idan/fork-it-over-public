import type { Ingredient } from "../types";

// Unicode fraction map
const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const UNITS = new Set([
  "cup", "cups",
  "tsp", "teaspoon", "teaspoons",
  "tbsp", "tablespoon", "tablespoons",
  "oz", "ounce", "ounces",
  "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams",
  "kg", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters",
  "quart", "quarts", "qt",
  "pint", "pints", "pt",
  "gallon", "gallons", "gal",
  "stick", "sticks",
  "clove", "cloves",
  "slice", "slices",
  "piece", "pieces",
  "can", "cans",
  "bag", "bags",
  "bunch", "bunches",
  "head", "heads",
  "sprig", "sprigs",
  "pinch", "pinches",
  "dash", "dashes",
  "package", "packages", "pkg",
  "jar", "jars",
  "bottle", "bottles",
  "box", "boxes",
]);

function fractionToDecimal(s: string): number {
  const parts = s.split("/");
  if (parts.length === 2) {
    return Number(parts[0]) / Number(parts[1]);
  }
  return Number(s);
}

/**
 * Parse a leading quantity from ingredient text.
 * Handles: integers, decimals, fractions (1/2), mixed numbers (1 1/2),
 * unicode fractions (½), ranges (2-3), and combinations (1½).
 */
function parseQuantityString(text: string): { value: string; rest: string } | null {
  // Replace unicode fractions with decimal equivalents first
  let normalized = text;
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    normalized = normalized.replace(char, ` ${val} `);
  }
  normalized = normalized.trimStart();

  // Match: optional whole number, optional fraction, optional range part
  // Examples: "2", "1/2", "1 1/2", "2.5", "2-3", "1 1/2 - 2"
  const rangePattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*(?:-\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*))?/;
  const match = normalized.match(rangePattern);

  if (!match) return null;

  const fullMatch = match[0];
  const rest = normalized.slice(fullMatch.length).trim();

  // Reconstruct the original quantity string from the source text
  // Count how many characters we consumed from the original
  let consumed = 0;
  let ni = 0; // index into normalized
  let oi = 0; // index into original (after trimStart)
  const trimmed = text.trimStart();
  const leadingSpaces = text.length - trimmed.length;

  // Walk through original text to find where the quantity ends
  // by matching against what we parsed from normalized
  while (ni < fullMatch.length && oi < trimmed.length) {
    if (trimmed[oi] in UNICODE_FRACTIONS) {
      // A unicode fraction was expanded, skip past the expansion in normalized
      const expanded = ` ${UNICODE_FRACTIONS[trimmed[oi]]} `;
      ni += expanded.length;
      oi++;
    } else {
      ni++;
      oi++;
    }
  }
  consumed = oi;

  const originalQuantity = trimmed.slice(0, consumed).trim();
  const originalRest = trimmed.slice(consumed).trim();

  return { value: originalQuantity, rest: originalRest };
}

/**
 * Convert a quantity string to a numeric value.
 * Handles fractions, mixed numbers, unicode fractions, and ranges.
 * For ranges, returns [low, high]. For single values, returns [value, value].
 */
function quantityToNumbers(quantity: string): [number, number] {
  // Replace unicode fractions
  let normalized = quantity;
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    normalized = normalized.replace(char, String(val));
  }

  // Split on range separator
  const rangeParts = normalized.split(/\s*-\s*/);

  function parseSingle(s: string): number {
    s = s.trim();
    // Mixed number: "1 1/2"
    const mixedMatch = s.match(/^(\d+)\s+(\d+\/\d+)$/);
    if (mixedMatch) {
      return Number(mixedMatch[1]) + fractionToDecimal(mixedMatch[2]);
    }
    // Fraction: "1/2"
    if (s.includes("/")) {
      return fractionToDecimal(s);
    }
    return Number(s);
  }

  const low = parseSingle(rangeParts[0]);
  const high = rangeParts.length > 1 ? parseSingle(rangeParts[1]) : low;

  return [low, high];
}

/**
 * Format a number nicely — use fractions for common values, otherwise decimals.
 */
function formatNumber(n: number): string {
  // Common fractions
  const fractions: [number, string][] = [
    [0.125, "1/8"],
    [0.25, "1/4"],
    [1 / 3, "1/3"],
    [0.375, "3/8"],
    [0.5, "1/2"],
    [0.625, "5/8"],
    [2 / 3, "2/3"],
    [0.75, "3/4"],
    [0.875, "7/8"],
  ];

  if (Number.isInteger(n)) return String(n);

  const whole = Math.floor(n);
  const frac = n - whole;

  for (const [val, str] of fractions) {
    if (Math.abs(frac - val) < 0.01) {
      return whole > 0 ? `${whole} ${str}` : str;
    }
  }

  // Round to reasonable precision
  const rounded = Math.round(n * 100) / 100;
  // Remove trailing zeros
  return String(rounded);
}

/**
 * Parse an ingredient text string into structured parts.
 */
export function parseIngredient(text: string): Ingredient {
  const trimmed = text.trim();
  const result: Ingredient = { original: trimmed };

  const parsed = parseQuantityString(trimmed);
  if (!parsed) return result;

  result.quantity = parsed.value;

  // Check if the next word is a unit
  const rest = parsed.rest;
  const wordMatch = rest.match(/^(\S+)\s*(.*)/);

  if (wordMatch) {
    const possibleUnit = wordMatch[1].toLowerCase().replace(/[.,]$/, "");
    if (UNITS.has(possibleUnit)) {
      result.unit = wordMatch[1].replace(/[.,]$/, "");
      result.name = wordMatch[2].trim() || undefined;
    } else {
      result.name = rest || undefined;
    }
  } else {
    result.name = rest || undefined;
  }

  return result;
}

/**
 * Scale a quantity string by a multiplier and return formatted text.
 */
export function scaleQuantity(quantity: string, multiplier: number): string {
  const [low, high] = quantityToNumbers(quantity);
  const scaledLow = low * multiplier;
  const scaledHigh = high * multiplier;

  if (low === high) {
    return formatNumber(scaledLow);
  }
  return `${formatNumber(scaledLow)}-${formatNumber(scaledHigh)}`;
}

/**
 * Produce display text for an ingredient with a scaled quantity.
 */
export function formatIngredient(ing: Ingredient, multiplier: number): string {
  if (!ing.quantity || multiplier === 1) {
    return ing.original;
  }

  const scaled = scaleQuantity(ing.quantity, multiplier);
  const parts = [scaled];
  if (ing.unit) parts.push(ing.unit);
  if (ing.name) parts.push(ing.name);
  return parts.join(" ");
}
