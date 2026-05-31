export type Category = { name: string; isStaple: boolean };

export const CATEGORIES: Category[] = [
  { name: "fruit & veg", isStaple: false },
  { name: "meat & fish", isStaple: false },
  { name: "dairy & eggs", isStaple: false },
  { name: "bakery", isStaple: false },
  { name: "frozen", isStaple: false },
  { name: "drinks", isStaple: false },
  { name: "grains & pulses", isStaple: false },
  { name: "canned & jarred", isStaple: false },
  { name: "nuts & seeds", isStaple: false },
  { name: "baking & sweeteners", isStaple: false },
  { name: "condiments & sauces", isStaple: true },
  { name: "spices & herbs", isStaple: true },
  { name: "personal care", isStaple: false },
  { name: "household & cleaning", isStaple: false },
  { name: "health & pharmacy", isStaple: false },
  { name: "pet care", isStaple: false },
  { name: "other", isStaple: false },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function categoryIsStaple(name: string): boolean {
  return CATEGORIES.find((c) => c.name === name)?.isStaple ?? false;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  "fruit & veg": "🥦",
  "meat & fish": "🥩",
  "dairy & eggs": "🥛",
  "bakery": "🍞",
  "frozen": "❄️",
  "drinks": "🧃",
  "grains & pulses": "🌾",
  "canned & jarred": "🥫",
  "nuts & seeds": "🥜",
  "baking & sweeteners": "🍯",
  "condiments & sauces": "🫙",
  "spices & herbs": "🧂",
  "personal care": "🪥",
  "household & cleaning": "🧹",
  "health & pharmacy": "💊",
  "pet care": "🐾",
  "other": "🛒",
};
