import type { ItemSpec, ItemCategory } from "@/types";

/**
 * Master item database.
 * Keys are lowercase canonical item names (with size prefix where applicable).
 * Aliases map alternative spellings to canonical keys.
 */

export const ITEM_DATABASE: Record<string, ItemSpec> = {
  // ── Boxes ────────────────────────────────────────────────────────────────
  "small box":       { cubicFeet: 1.5,  weightLbs: 30,  category: "box" },
  "medium box":      { cubicFeet: 3.0,  weightLbs: 40,  category: "box" },
  "large box":       { cubicFeet: 4.5,  weightLbs: 50,  category: "box" },
  "wardrobe box":    { cubicFeet: 10.0, weightLbs: 80,  category: "box" },
  "box":             { cubicFeet: 3.0,  weightLbs: 40,  category: "box" }, // default medium

  // ── Mattresses & Beds ───────────────────────────────────────────────────
  "twin mattress":   { cubicFeet: 15,   weightLbs: 40,  category: "mattress" },
  "full mattress":   { cubicFeet: 18,   weightLbs: 50,  category: "mattress" },
  "queen mattress":  { cubicFeet: 23,   weightLbs: 60,  category: "mattress" },
  "king mattress":   { cubicFeet: 28,   weightLbs: 80,  category: "mattress" },
  "mattress":        { cubicFeet: 23,   weightLbs: 60,  category: "mattress" }, // default queen

  // Bed = mattress + frame combined estimate
  "twin bed":        { cubicFeet: 25,   weightLbs: 80,  category: "mattress" },
  "full bed":        { cubicFeet: 30,   weightLbs: 100, category: "mattress" },
  "queen bed":       { cubicFeet: 38,   weightLbs: 130, category: "mattress" },
  "king bed":        { cubicFeet: 48,   weightLbs: 180, category: "mattress" },
  "bed":             { cubicFeet: 38,   weightLbs: 130, category: "mattress" }, // default queen

  // Bed frames standalone
  "bed frame":       { cubicFeet: 12,   weightLbs: 60,  category: "mattress" },
  "headboard":       { cubicFeet: 8,    weightLbs: 40,  category: "mattress" },

  // ── Seating ─────────────────────────────────────────────────────────────
  "sofa":            { cubicFeet: 45,   weightLbs: 150, category: "seating" },
  "couch":           { cubicFeet: 45,   weightLbs: 150, category: "seating" },
  "sectional sofa":  { cubicFeet: 75,   weightLbs: 280, category: "seating" },
  "sectional":       { cubicFeet: 75,   weightLbs: 280, category: "seating" },
  "loveseat":        { cubicFeet: 30,   weightLbs: 100, category: "seating" },
  "armchair":        { cubicFeet: 20,   weightLbs: 75,  category: "seating" },
  "recliner":        { cubicFeet: 25,   weightLbs: 105, category: "seating" },
  "office chair":    { cubicFeet: 12,   weightLbs: 40,  category: "seating" },
  "dining chair":    { cubicFeet: 5,    weightLbs: 15,  category: "seating" },
  "bar stool":       { cubicFeet: 4,    weightLbs: 15,  category: "seating" },
  "bench":           { cubicFeet: 12,   weightLbs: 50,  category: "seating" },

  // ── Tables ───────────────────────────────────────────────────────────────
  "dining table":    { cubicFeet: 35,   weightLbs: 120, category: "table" },
  "kitchen table":   { cubicFeet: 30,   weightLbs: 100, category: "table" },
  "coffee table":    { cubicFeet: 12,   weightLbs: 40,  category: "table" },
  "end table":       { cubicFeet: 8,    weightLbs: 25,  category: "table" },
  "side table":      { cubicFeet: 8,    weightLbs: 25,  category: "table" },
  "console table":   { cubicFeet: 12,   weightLbs: 45,  category: "table" },
  "nightstand":      { cubicFeet: 10,   weightLbs: 40,  category: "table" },
  "night stand":     { cubicFeet: 10,   weightLbs: 40,  category: "table" },
  "buffet":          { cubicFeet: 30,   weightLbs: 180, category: "table" },
  "sideboard":       { cubicFeet: 28,   weightLbs: 160, category: "table" },
  "marble table":    { cubicFeet: 35,   weightLbs: 350, category: "table", special: true },

  // ── Storage / Bedroom furniture ──────────────────────────────────────────
  "dresser":         { cubicFeet: 25,   weightLbs: 125, category: "storage" },
  "chest":           { cubicFeet: 20,   weightLbs: 100, category: "storage" },
  "chest of drawers":{ cubicFeet: 25,   weightLbs: 115, category: "storage" },
  "wardrobe":        { cubicFeet: 35,   weightLbs: 160, category: "storage" },
  "armoire":         { cubicFeet: 40,   weightLbs: 200, category: "storage" },
  "bookshelf":       { cubicFeet: 20,   weightLbs: 90,  category: "storage" },
  "bookcase":        { cubicFeet: 20,   weightLbs: 90,  category: "storage" },
  "desk":            { cubicFeet: 30,   weightLbs: 140, category: "storage" },
  "filing cabinet":  { cubicFeet: 10,   weightLbs: 80,  category: "storage" },
  "shelving unit":   { cubicFeet: 18,   weightLbs: 70,  category: "storage" },
  "media console":   { cubicFeet: 20,   weightLbs: 85,  category: "storage" },
  "tv stand":        { cubicFeet: 15,   weightLbs: 60,  category: "storage" },
  "entertainment center": { cubicFeet: 40, weightLbs: 180, category: "storage" },

  // ── Appliances ───────────────────────────────────────────────────────────
  "refrigerator":    { cubicFeet: 45,   weightLbs: 300, category: "appliance" },
  "fridge":          { cubicFeet: 45,   weightLbs: 300, category: "appliance" },
  "washer":          { cubicFeet: 20,   weightLbs: 180, category: "appliance" },
  "washing machine": { cubicFeet: 20,   weightLbs: 180, category: "appliance" },
  "dryer":           { cubicFeet: 20,   weightLbs: 150, category: "appliance" },
  "dishwasher":      { cubicFeet: 18,   weightLbs: 130, category: "appliance" },
  "stove":           { cubicFeet: 25,   weightLbs: 160, category: "appliance" },
  "range":           { cubicFeet: 25,   weightLbs: 160, category: "appliance" },
  "oven":            { cubicFeet: 20,   weightLbs: 130, category: "appliance" },
  "microwave":       { cubicFeet: 5,    weightLbs: 35,  category: "appliance" },
  "freezer":         { cubicFeet: 35,   weightLbs: 200, category: "appliance" },
  "chest freezer":   { cubicFeet: 30,   weightLbs: 180, category: "appliance" },

  // ── Electronics ─────────────────────────────────────────────────────────
  "small tv":        { cubicFeet: 8,    weightLbs: 25,  category: "electronics" },
  "medium tv":       { cubicFeet: 15,   weightLbs: 40,  category: "electronics" },
  "large tv":        { cubicFeet: 25,   weightLbs: 70,  category: "electronics" },
  "tv":              { cubicFeet: 15,   weightLbs: 40,  category: "electronics" }, // default medium
  "television":      { cubicFeet: 15,   weightLbs: 40,  category: "electronics" },
  "monitor":         { cubicFeet: 6,    weightLbs: 15,  category: "electronics" },
  "computer":        { cubicFeet: 4,    weightLbs: 20,  category: "electronics" },
  "desktop computer":{ cubicFeet: 4,    weightLbs: 20,  category: "electronics" },

  // ── Decor ────────────────────────────────────────────────────────────────
  "lamp":            { cubicFeet: 5,    weightLbs: 10,  category: "decor" },
  "floor lamp":      { cubicFeet: 6,    weightLbs: 12,  category: "decor" },
  "table lamp":      { cubicFeet: 3,    weightLbs: 8,   category: "decor" },
  "mirror":          { cubicFeet: 6,    weightLbs: 20,  category: "decor" },
  "rug":             { cubicFeet: 5,    weightLbs: 25,  category: "decor" },
  "area rug":        { cubicFeet: 7,    weightLbs: 35,  category: "decor" },
  "artwork":         { cubicFeet: 3,    weightLbs: 10,  category: "decor" },
  "painting":        { cubicFeet: 3,    weightLbs: 10,  category: "decor" },
  "plant":           { cubicFeet: 4,    weightLbs: 20,  category: "decor" },

  // ── Special / High-value ─────────────────────────────────────────────────
  "piano":           { cubicFeet: 60,   weightLbs: 800, category: "special", special: true },
  "upright piano":   { cubicFeet: 50,   weightLbs: 600, category: "special", special: true },
  "grand piano":     { cubicFeet: 90,   weightLbs: 1200,category: "special", special: true },
  "safe":            { cubicFeet: 8,    weightLbs: 500, category: "special", special: true },
  "gun safe":        { cubicFeet: 10,   weightLbs: 600, category: "special", special: true },
  "pool table":      { cubicFeet: 55,   weightLbs: 700, category: "special", special: true },
  "hot tub":         { cubicFeet: 80,   weightLbs: 900, category: "special", special: true },
  "aquarium":        { cubicFeet: 15,   weightLbs: 200, category: "special", special: true },

  // ── Outdoor ──────────────────────────────────────────────────────────────
  "patio table":     { cubicFeet: 25,   weightLbs: 60,  category: "outdoor" },
  "patio chair":     { cubicFeet: 8,    weightLbs: 20,  category: "outdoor" },
  "outdoor furniture": { cubicFeet: 40, weightLbs: 100, category: "outdoor" },
  "grill":           { cubicFeet: 15,   weightLbs: 60,  category: "outdoor" },
  "bbq":             { cubicFeet: 15,   weightLbs: 60,  category: "outdoor" },
  "lawn mower":      { cubicFeet: 10,   weightLbs: 90,  category: "outdoor" },
  "bicycle":         { cubicFeet: 10,   weightLbs: 30,  category: "outdoor" },
  "bike":            { cubicFeet: 10,   weightLbs: 30,  category: "outdoor" },
};

/**
 * Alias map: maps alternative terms to a canonical key in ITEM_DATABASE.
 * Applied before database lookup.
 */
export const ITEM_ALIASES: Record<string, string> = {
  "couch":            "sofa",
  "loveseat":         "loveseat",
  "sectional couch":  "sectional sofa",
  "fridge":           "refrigerator",
  "washing machine":  "washer",
  "chest of drawers": "dresser",
  "bookcase":         "bookshelf",
  "television":       "tv",
  "night stand":      "nightstand",
  "kitchen table":    "dining table",
  "side table":       "end table",
  "tv stand":         "media console",
  "range":            "stove",
  "armoire":          "wardrobe",
  "sideboard":        "buffet",
};

/** Categories expected in a typical full move — used for confidence scoring. */
export const TYPICAL_CATEGORIES: ItemCategory[] = [
  "mattress",
  "seating",
  "storage",
  "box",
];
