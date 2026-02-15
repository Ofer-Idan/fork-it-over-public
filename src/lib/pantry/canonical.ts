const STRIP_PREFIXES = [
  "canned",
  "fresh",
  "frozen",
  "dried",
  "organic",
  "chopped",
  "diced",
  "sliced",
  "minced",
  "ground",
  "whole",
];

export function toCanonicalName(name: string): string {
  let canonical = name.toLowerCase().trim();

  // Strip common prefixes
  for (const prefix of STRIP_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s+`, "i");
    canonical = canonical.replace(re, "");
  }

  // Remove non-alphanumeric (keep spaces temporarily)
  canonical = canonical.replace(/[^a-z0-9\s]/g, "");

  // Collapse whitespace and replace with underscores
  canonical = canonical.replace(/\s+/g, "_").replace(/^_|_$/g, "");

  return canonical;
}
