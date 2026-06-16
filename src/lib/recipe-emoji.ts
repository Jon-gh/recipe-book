import { getIngredientEmoji } from "./ingredient-emoji";

const DISH_KEYWORD_EMOJI: [string[], string][] = [
  [["pizza"], "🍕"],
  [["burger", "hamburger"], "🍔"],
  [["hotdog", "hot dog", "hot-dog"], "🌭"],
  [["taco", "burrito", "fajita", "quesadilla", "enchilada", "nacho"], "🌮"],
  [["wrap"], "🌯"],
  [["sushi", "sashimi", "maki", "onigiri"], "🍣"],
  [["ramen", "pho", "pad thai", "udon", "soba", "laksa"], "🍜"],
  [["pasta", "spaghetti", "carbonara", "bolognese", "lasagna", "lasagne", "fettuccine", "penne", "rigatoni", "tagliatelle", "linguine", "gnocchi", "ravioli"], "🍝"],
  [["curry", "tikka", "korma", "vindaloo", "biryani", "dal", "dhal", "masala"], "🍛"],
  [["risotto", "paella", "pilaf", "pilau", "fried rice"], "🍚"],
  [["rice"], "🍚"],
  [["soup", "stew", "chili", "chilli", "bisque", "chowder", "minestrone", "ramen", "broth", "potage", "goulash"], "🍲"],
  [["salad"], "🥗"],
  [["sandwich", "sub", "panini", "toastie", "club"], "🥪"],
  [["omelette", "omelet", "frittata", "quiche", "shakshuka"], "🍳"],
  [["pancake", "waffle", "crepe", "crêpe"], "🥞"],
  [["cake", "cupcake", "muffin", "loaf cake", "bundt"], "🎂"],
  [["brownie", "blondie"], "🍫"],
  [["cookie", "biscuit", "shortbread", "macaron", "macaroon"], "🍪"],
  [["ice cream", "gelato", "sorbet", "parfait"], "🍦"],
  [["tart", "galette", "clafoutis"], "🥧"],
  [["pie"], "🥧"],
  [["bread", "baguette", "sourdough", "focaccia", "brioche", "roll", "bun"], "🍞"],
  [["toast", "bruschetta", "crostini"], "🍞"],
  [["porridge", "oatmeal", "granola", "muesli"], "🥣"],
  [["smoothie", "milkshake", "shake"], "🥤"],
  [["juice"], "🧃"],
  [["cocktail", "mocktail", "lemonade"], "🍹"],
  [["roast", "roasted"], "🍖"],
  [["steak", "ribeye", "sirloin", "filet", "fillet mignon"], "🥩"],
  [["chicken", "poultry", "turkey", "duck"], "🍗"],
  [["fish", "salmon", "tuna", "cod", "sea bass", "trout", "halibut", "mackerel"], "🐟"],
  [["seafood", "shrimp", "prawn", "lobster", "crab", "scallop", "squid", "octopus", "mussel", "clam"], "🦞"],
  [["pork", "bacon", "ham", "sausage", "chorizo"], "🥓"],
  [["beef", "meatball", "meatloaf"], "🥩"],
  [["hummus", "guacamole", "tzatziki", "salsa", "dip"], "🫙"],
  [["vegetable", "veggie", "vegan", "vegetarian"], "🥦"],
  [["spring roll", "dumpling", "dim sum", "gyoza", "wonton"], "🥟"],
];

export function getRecipeEmoji(recipeName: string, ingredientNames: string[]): string {
  const lowerName = recipeName.toLowerCase();
  for (const [keywords, emoji] of DISH_KEYWORD_EMOJI) {
    if (keywords.some((kw) => lowerName.includes(kw))) return emoji;
  }
  for (const name of ingredientNames) {
    const emoji = getIngredientEmoji(name, "other");
    if (emoji !== "🛒") return emoji;
  }
  return "🍳";
}
