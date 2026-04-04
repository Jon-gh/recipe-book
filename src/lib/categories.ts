export type Category = { name: string; isStaple: boolean };

export const CATEGORIES: Category[] = [
  { name: "produce", isStaple: false },
  { name: "meat & fish", isStaple: false },
  { name: "dairy & eggs", isStaple: false },
  { name: "bakery", isStaple: false },
  { name: "frozen", isStaple: false },
  { name: "drinks", isStaple: false },
  { name: "grains & pulses", isStaple: false },
  { name: "condiments & sauces", isStaple: true },
  { name: "spices & herbs", isStaple: true },
  { name: "other", isStaple: false },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function categoryIsStaple(name: string): boolean {
  return CATEGORIES.find((c) => c.name === name)?.isStaple ?? false;
}
