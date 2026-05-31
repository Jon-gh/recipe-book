const KEYWORD_EMOJI: [string[], string][] = [
  [["pasta", "spaghetti", "fettuccine", "linguine", "penne", "rigatoni", "tagliatelle"], "🍝"],
  [["noodle", "ramen", "pho", "udon", "soba", "lo mein", "chow mein"], "🍜"],
  [["pizza"], "🍕"],
  [["burger", "hamburger"], "🍔"],
  [["taco", "burrito", "quesadilla", "fajita", "enchilada"], "🌮"],
  [["sushi", "maki", "nigiri"], "🍱"],
  [["curry"], "🍛"],
  [["soup", "stew", "chowder", "bisque", "broth", "chili", "chilli"], "🍲"],
  [["salad"], "🥗"],
  [["rice", "risotto", "pilaf", "paella", "fried rice"], "🍚"],
  [["chicken"], "🍗"],
  [["steak", "beef", "lamb", "venison"], "🥩"],
  [["pork", "bacon", "ham", "sausage", "chorizo"], "🥓"],
  [["fish", "salmon", "tuna", "cod", "halibut", "sea bass", "trout", "tilapia"], "🐟"],
  [["shrimp", "prawn", "lobster", "crab", "scallop"], "🍤"],
  [["egg", "omelette", "omelet", "frittata", "quiche"], "🥚"],
  [["bread", "sandwich", "toast", "baguette", "focaccia", "flatbread", "wrap"], "🥪"],
  [["cake", "brownie", "cookie", "cupcake", "muffin", "chocolate", "dessert", "pudding", "tart", "pie"], "🎂"],
  [["pancake", "waffle", "crepe", "crêpe"], "🧇"],
  [["mushroom"], "🍄"],
  [["potato", "potatoes", "fries", "mashed", "hash brown"], "🥔"],
  [["smoothie", "juice", "shake", "drink"], "🥤"],
  [["ice cream", "gelato", "sorbet"], "🍦"],
  [["dumpling", "gyoza", "pierogi", "ravioli"], "🥟"],
];

export function getRecipeEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [keywords, emoji] of KEYWORD_EMOJI) {
    if (keywords.some((kw) => lower.includes(kw))) return emoji;
  }
  return "🍳";
}
