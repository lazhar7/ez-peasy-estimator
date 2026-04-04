import { ITEM_DATABASE, ITEM_ALIASES } from "./inventory-data";
import type { ParsedItem, ItemCategory, ItemSpec } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
};

const SIZE_PREFIXES = ["small", "medium", "large", "twin", "full", "queen", "king"];

// Keywords that suggest a multi-stop or storage move
const MULTI_STOP_KEYWORDS = [
  "storage unit", "storage facility", "second stop", "multiple stops",
  "two locations", "two addresses", "pick up from", "pickup from",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract a leading quantity from a token string.
 * Handles: "3", "three", "a", "an"
 * Returns { qty, rest } where rest is the remaining text.
 */
function extractQty(text: string): { qty: number; rest: string } {
  const parts = text.split(" ");

  // Numeric digit at start
  const asNum = parseInt(parts[0], 10);
  if (!isNaN(asNum) && asNum > 0) {
    return { qty: asNum, rest: parts.slice(1).join(" ").trim() };
  }

  // Written number
  const wordNum = NUMBER_WORDS[parts[0]];
  if (wordNum !== undefined) {
    return { qty: wordNum, rest: parts.slice(1).join(" ").trim() };
  }

  // "a" or "an"
  if (parts[0] === "a" || parts[0] === "an") {
    return { qty: 1, rest: parts.slice(1).join(" ").trim() };
  }

  return { qty: 1, rest: text };
}

/**
 * Strip common plural suffixes to improve matching.
 * E.g. "chairs" → "chair", "boxes" → "box"
 */
function depluralize(text: string): string {
  if (text.endsWith("ves")) return text.slice(0, -3) + "f";   // shelves → shelf
  if (text.endsWith("ies")) return text.slice(0, -3) + "y";   // batteries → battery
  if (text.endsWith("ses") || text.endsWith("xes") || text.endsWith("zes"))
    return text.slice(0, -2); // boxes → box, benches → bench (approx)
  if (text.endsWith("es") && text.length > 4) {
    const stem = text.slice(0, -2);
    if (ITEM_DATABASE[stem] !== undefined) return stem;
  }
  if (text.endsWith("s") && text.length > 3) {
    const stem = text.slice(0, -1);
    if (ITEM_DATABASE[stem] !== undefined) return stem;
  }
  return text;
}

/**
 * Attempt to find a matching item spec given a normalised item description.
 * Strategy (highest priority first):
 *   1. Direct exact match
 *   2. Alias lookup
 *   3. Size-prefix variant (e.g. "king" + "bed" → "king bed")
 *   4. Depluralized exact match
 *   5. Partial / substring match against DB keys
 *   6. Fallback: reasonable custom estimate
 */
function lookupItem(text: string): { spec: ItemSpec; label: string; isCustom: boolean } {
  const normalized = normalizeText(text);

  // 1. Direct match
  if (ITEM_DATABASE[normalized]) {
    return { spec: ITEM_DATABASE[normalized], label: toTitleCase(normalized), isCustom: false };
  }

  // 2. Alias
  const aliasKey = ITEM_ALIASES[normalized];
  if (aliasKey && ITEM_DATABASE[aliasKey]) {
    return { spec: ITEM_DATABASE[aliasKey], label: toTitleCase(aliasKey), isCustom: false };
  }

  // 3. Size prefix variant — split first word if it's a size prefix
  const words = normalized.split(" ");
  if (words.length >= 2 && SIZE_PREFIXES.includes(words[0])) {
    // Try "size + last_word" (e.g. "king size bed" → "king bed")
    const sizeKey = `${words[0]} ${words[words.length - 1]}`;
    if (ITEM_DATABASE[sizeKey]) {
      return { spec: ITEM_DATABASE[sizeKey], label: toTitleCase(sizeKey), isCustom: false };
    }
    // Try without size prefix (fall through to base item)
    const baseKey = depluralize(words.slice(1).join(" "));
    if (ITEM_DATABASE[baseKey]) {
      return { spec: ITEM_DATABASE[baseKey], label: toTitleCase(normalized), isCustom: false };
    }
  }

  // 4. Depluralize
  const depluralized = depluralize(normalized);
  if (depluralized !== normalized && ITEM_DATABASE[depluralized]) {
    return { spec: ITEM_DATABASE[depluralized], label: toTitleCase(depluralized), isCustom: false };
  }

  // 5. Substring match — find DB key that is contained in the input
  for (const key of Object.keys(ITEM_DATABASE)) {
    if (normalized.includes(key)) {
      return { spec: ITEM_DATABASE[key], label: toTitleCase(key), isCustom: false };
    }
  }
  // Or input contained in a DB key
  for (const key of Object.keys(ITEM_DATABASE)) {
    if (key.includes(normalized)) {
      return { spec: ITEM_DATABASE[key], label: toTitleCase(key), isCustom: false };
    }
  }

  // 6. Custom estimate — small/medium/large heuristics
  const category: ItemCategory = "unknown";
  let cubicFeet = 10;
  let weightLbs = 50;

  if (normalized.includes("large") || normalized.includes("big") || normalized.includes("heavy")) {
    cubicFeet = 30; weightLbs = 150;
  } else if (normalized.includes("small") || normalized.includes("tiny")) {
    cubicFeet = 5; weightLbs = 20;
  }

  return {
    spec: { cubicFeet, weightLbs, category },
    label: toTitleCase(normalized),
    isCustom: true,
  };
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main parser ─────────────────────────────────────────────────────────────

/**
 * Split raw input text into individual item tokens.
 * Supports comma-separated and newline-separated lists.
 * Strips room headings like "Bedroom:", "Living Room -".
 */
function splitIntoTokens(input: string): string[] {
  return input
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    // Remove room headings: lines that end with ":" or "-" or are all caps
    .map((s) => s.replace(/^[A-Za-z\s]+[-:]+\s*/, "").trim())
    .filter((s) => s.length > 0);
}

export interface ParseResult {
  items: ParsedItem[];
  hasMultiStop: boolean;
  rawInput: string;
}

export function parseInventory(rawInput: string): ParseResult {
  const hasMultiStop = MULTI_STOP_KEYWORDS.some((kw) =>
    rawInput.toLowerCase().includes(kw)
  );

  const tokens = splitIntoTokens(rawInput);
  const items: ParsedItem[] = [];

  for (const token of tokens) {
    if (!token) continue;

    const normalized = normalizeText(token);
    const { qty, rest } = extractQty(normalized);

    if (!rest) continue;

    const { spec, label, isCustom } = lookupItem(rest);

    const totalCubicFeet = spec.cubicFeet * qty;
    const totalWeightLbs = spec.weightLbs * qty;

    items.push({
      rawText: token,
      qty,
      label,
      cubicFeetEach: spec.cubicFeet,
      weightLbsEach: spec.weightLbs,
      totalCubicFeet,
      totalWeightLbs,
      category: spec.category,
      isCustomEstimate: isCustom,
      isSpecial: spec.special ?? false,
    });
  }

  return { items, hasMultiStop, rawInput };
}
