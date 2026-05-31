import { CATEGORY_EMOJI } from "./categories";

const KEYWORD_EMOJI: [string[], string][] = [
  [["garlic"], "🧄"],
  [["onion", "shallot", "leek"], "🧅"],
  [["tomato", "tomatoes"], "🍅"],
  [["egg", "eggs"], "🥚"],
  [["butter"], "🧈"],
  [["milk", "cream", "yogurt", "yoghurt"], "🥛"],
  [["cheese", "parmesan", "pecorino", "mozzarella", "cheddar", "ricotta", "gouda", "feta"], "🧀"],
  [["olive oil", "oil"], "🫒"],
  [["chicken", "turkey", "duck"], "🍗"],
  [["beef", "steak", "mince", "ground beef", "veal", "lamb", "venison"], "🥩"],
  [["pork", "bacon", "ham", "sausage", "chorizo", "pancetta", "prosciutto", "lardons"], "🥓"],
  [["fish", "salmon", "tuna", "cod", "halibut", "sea bass", "trout", "tilapia", "anchovy", "sardine"], "🐟"],
  [["shrimp", "prawn", "lobster", "crab", "scallop", "squid", "octopus"], "🍤"],
  [["pasta", "spaghetti", "fettuccine", "penne", "rigatoni", "linguine", "tagliatelle", "noodle"], "🍝"],
  [["rice"], "🍚"],
  [["flour"], "🌾"],
  [["bread", "baguette", "sourdough", "loaf"], "🍞"],
  [["carrot"], "🥕"],
  [["potato", "potatoes"], "🥔"],
  [["lemon", "lime"], "🍋"],
  [["pepper", "capsicum", "bell pepper"], "🫑"],
  [["mushroom", "mushrooms"], "🍄"],
  [["spinach", "lettuce", "kale", "arugula", "rocket"], "🥬"],
  [["broccoli", "cauliflower"], "🥦"],
  [["avocado"], "🥑"],
  [["cucumber"], "🥒"],
  [["corn", "sweetcorn", "maize"], "🌽"],
  [["herbs", "basil", "parsley", "coriander", "cilantro", "thyme", "rosemary", "oregano", "mint", "dill"], "🌿"],
  [["salt"], "🧂"],
  [["sugar", "honey", "maple syrup", "molasses", "syrup"], "🍯"],
  [["wine", "vinegar", "balsamic"], "🍷"],
  [["stock", "broth", "bouillon"], "🫕"],
  [["bean", "beans", "lentil", "lentils", "chickpea", "chickpeas"], "🫘"],
  [["chocolate", "cocoa", "cacao"], "🍫"],
  [["almond", "walnut", "cashew", "peanut", "pecan", "pistachio", "hazelnut"], "🥜"],
];

export function getIngredientEmoji(name: string, category: string): string {
  const lower = name.toLowerCase();
  for (const [keywords, emoji] of KEYWORD_EMOJI) {
    if (keywords.some((kw) => lower.includes(kw))) return emoji;
  }
  return CATEGORY_EMOJI[category] ?? "🛒";
}
