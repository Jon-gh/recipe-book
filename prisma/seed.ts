import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

type ProductSeed = {
  name: string;
  category: string;
  defaultUnit: string;
  defaultQuantity: number;
};

const products: ProductSeed[] = [
  // fruit & veg
  { name: "apple", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "banana", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "orange", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "lemon", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "lime", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "avocado", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "tomato", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "cherry tomatoes", category: "fruit & veg", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "onion", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "red onion", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "spring onion", category: "fruit & veg", defaultUnit: "bunch", defaultQuantity: 1 },
  { name: "garlic", category: "fruit & veg", defaultUnit: "clove", defaultQuantity: 2 },
  { name: "ginger", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 20 },
  { name: "potato", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 500 },
  { name: "sweet potato", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "carrot", category: "fruit & veg", defaultUnit: "", defaultQuantity: 2 },
  { name: "broccoli", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "cauliflower", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "spinach", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 200 },
  { name: "kale", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 200 },
  { name: "lettuce", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "cucumber", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "courgette", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "pepper", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "red pepper", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "mushrooms", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 250 },
  { name: "celery", category: "fruit & veg", defaultUnit: "stick", defaultQuantity: 2 },
  { name: "leek", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "asparagus", category: "fruit & veg", defaultUnit: "bunch", defaultQuantity: 1 },
  { name: "peas", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 200 },
  { name: "green beans", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 200 },
  { name: "corn on the cob", category: "fruit & veg", defaultUnit: "", defaultQuantity: 2 },
  { name: "butternut squash", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "aubergine", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "chilli", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "fresh basil", category: "fruit & veg", defaultUnit: "bunch", defaultQuantity: 1 },
  { name: "fresh parsley", category: "fruit & veg", defaultUnit: "bunch", defaultQuantity: 1 },
  { name: "fresh coriander", category: "fruit & veg", defaultUnit: "bunch", defaultQuantity: 1 },
  { name: "fresh mint", category: "fruit & veg", defaultUnit: "bunch", defaultQuantity: 1 },
  { name: "mango", category: "fruit & veg", defaultUnit: "", defaultQuantity: 1 },
  { name: "strawberries", category: "fruit & veg", defaultUnit: "punnet", defaultQuantity: 1 },
  { name: "blueberries", category: "fruit & veg", defaultUnit: "punnet", defaultQuantity: 1 },
  { name: "raspberries", category: "fruit & veg", defaultUnit: "punnet", defaultQuantity: 1 },
  { name: "grapes", category: "fruit & veg", defaultUnit: "g", defaultQuantity: 500 },

  // meat & fish
  { name: "chicken breast", category: "meat & fish", defaultUnit: "g", defaultQuantity: 500 },
  { name: "chicken thighs", category: "meat & fish", defaultUnit: "g", defaultQuantity: 500 },
  { name: "minced beef", category: "meat & fish", defaultUnit: "g", defaultQuantity: 500 },
  { name: "beef steak", category: "meat & fish", defaultUnit: "g", defaultQuantity: 200 },
  { name: "bacon", category: "meat & fish", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "pork chops", category: "meat & fish", defaultUnit: "", defaultQuantity: 2 },
  { name: "sausages", category: "meat & fish", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "salmon fillet", category: "meat & fish", defaultUnit: "g", defaultQuantity: 200 },
  { name: "cod fillet", category: "meat & fish", defaultUnit: "g", defaultQuantity: 200 },
  { name: "prawns", category: "meat & fish", defaultUnit: "g", defaultQuantity: 200 },
  { name: "smoked salmon", category: "meat & fish", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "turkey mince", category: "meat & fish", defaultUnit: "g", defaultQuantity: 500 },
  { name: "lamb mince", category: "meat & fish", defaultUnit: "g", defaultQuantity: 500 },
  { name: "lamb chops", category: "meat & fish", defaultUnit: "", defaultQuantity: 2 },
  { name: "ham", category: "meat & fish", defaultUnit: "pack", defaultQuantity: 1 },

  // dairy & eggs
  { name: "milk", category: "dairy & eggs", defaultUnit: "ml", defaultQuantity: 500 },
  { name: "butter", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 250 },
  { name: "cheddar cheese", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 200 },
  { name: "mozzarella", category: "dairy & eggs", defaultUnit: "ball", defaultQuantity: 1 },
  { name: "parmesan", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 100 },
  { name: "cream cheese", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 200 },
  { name: "Greek yoghurt", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 500 },
  { name: "eggs", category: "dairy & eggs", defaultUnit: "", defaultQuantity: 6 },
  { name: "double cream", category: "dairy & eggs", defaultUnit: "ml", defaultQuantity: 300 },
  { name: "single cream", category: "dairy & eggs", defaultUnit: "ml", defaultQuantity: 300 },
  { name: "sour cream", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 200 },
  { name: "feta cheese", category: "dairy & eggs", defaultUnit: "g", defaultQuantity: 200 },
  { name: "oat milk", category: "dairy & eggs", defaultUnit: "litre", defaultQuantity: 1 },
  { name: "almond milk", category: "dairy & eggs", defaultUnit: "litre", defaultQuantity: 1 },

  // bakery
  { name: "white bread", category: "bakery", defaultUnit: "loaf", defaultQuantity: 1 },
  { name: "wholemeal bread", category: "bakery", defaultUnit: "loaf", defaultQuantity: 1 },
  { name: "sourdough", category: "bakery", defaultUnit: "loaf", defaultQuantity: 1 },
  { name: "baguette", category: "bakery", defaultUnit: "", defaultQuantity: 1 },
  { name: "pitta bread", category: "bakery", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "tortilla wraps", category: "bakery", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "croissants", category: "bakery", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "rolls", category: "bakery", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "crumpets", category: "bakery", defaultUnit: "pack", defaultQuantity: 1 },

  // frozen
  { name: "frozen peas", category: "frozen", defaultUnit: "g", defaultQuantity: 500 },
  { name: "frozen sweetcorn", category: "frozen", defaultUnit: "g", defaultQuantity: 500 },
  { name: "frozen berries", category: "frozen", defaultUnit: "g", defaultQuantity: 500 },
  { name: "ice cream", category: "frozen", defaultUnit: "tub", defaultQuantity: 1 },
  { name: "frozen chips", category: "frozen", defaultUnit: "bag", defaultQuantity: 1 },
  { name: "frozen spinach", category: "frozen", defaultUnit: "g", defaultQuantity: 500 },
  { name: "edamame", category: "frozen", defaultUnit: "g", defaultQuantity: 400 },

  // drinks
  { name: "orange juice", category: "drinks", defaultUnit: "litre", defaultQuantity: 1 },
  { name: "apple juice", category: "drinks", defaultUnit: "litre", defaultQuantity: 1 },
  { name: "sparkling water", category: "drinks", defaultUnit: "litre", defaultQuantity: 1 },
  { name: "still water", category: "drinks", defaultUnit: "litre", defaultQuantity: 2 },
  { name: "coconut water", category: "drinks", defaultUnit: "ml", defaultQuantity: 330 },
  { name: "coffee", category: "drinks", defaultUnit: "g", defaultQuantity: 250 },
  { name: "tea bags", category: "drinks", defaultUnit: "box", defaultQuantity: 1 },
  { name: "herbal tea", category: "drinks", defaultUnit: "box", defaultQuantity: 1 },

  // grains & pulses
  { name: "spaghetti", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "penne pasta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "fusilli pasta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "lasagne sheets", category: "grains & pulses", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "basmati rice", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "jasmine rice", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "arborio rice", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "oats", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "quinoa", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "couscous", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 300 },
  { name: "red lentils", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "green lentils", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "dried chickpeas", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "black beans", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "kidney beans", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "pearl barley", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 300 },
  { name: "egg noodles", category: "grains & pulses", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "rice noodles", category: "grains & pulses", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "polenta", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "bulgur wheat", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 400 },
  { name: "plain flour", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "self-raising flour", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },
  { name: "bread flour", category: "grains & pulses", defaultUnit: "g", defaultQuantity: 500 },

  // canned & jarred
  { name: "chopped tomatoes", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "coconut milk", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "tomato purée", category: "canned & jarred", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "baked beans", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "tinned tuna", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "tinned salmon", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "chickpeas", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "tinned kidney beans", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "tinned sweetcorn", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "passata", category: "canned & jarred", defaultUnit: "ml", defaultQuantity: 500 },
  { name: "anchovies", category: "canned & jarred", defaultUnit: "tin", defaultQuantity: 1 },
  { name: "olives", category: "canned & jarred", defaultUnit: "jar", defaultQuantity: 1 },
  { name: "roasted peppers", category: "canned & jarred", defaultUnit: "jar", defaultQuantity: 1 },
  { name: "vegetable stock", category: "canned & jarred", defaultUnit: "litre", defaultQuantity: 1 },
  { name: "chicken stock", category: "canned & jarred", defaultUnit: "litre", defaultQuantity: 1 },

  // nuts & seeds
  { name: "almonds", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "cashews", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "walnuts", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "hazelnuts", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "pine nuts", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 50 },
  { name: "peanuts", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "sunflower seeds", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "pumpkin seeds", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "sesame seeds", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 50 },
  { name: "flaxseeds", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 100 },
  { name: "chia seeds", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 50 },
  { name: "mixed nuts", category: "nuts & seeds", defaultUnit: "g", defaultQuantity: 200 },

  // baking & sweeteners
  { name: "caster sugar", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 200 },
  { name: "brown sugar", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 200 },
  { name: "icing sugar", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 200 },
  { name: "honey", category: "baking & sweeteners", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "maple syrup", category: "baking & sweeteners", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "golden syrup", category: "baking & sweeteners", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "baking powder", category: "baking & sweeteners", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "bicarbonate of soda", category: "baking & sweeteners", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "vanilla extract", category: "baking & sweeteners", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "cocoa powder", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 100 },
  { name: "dark chocolate", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 100 },
  { name: "milk chocolate", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 100 },
  { name: "dried yeast", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 7 },
  { name: "cornflour", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 100 },
  { name: "desiccated coconut", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 100 },
  { name: "almond flour", category: "baking & sweeteners", defaultUnit: "g", defaultQuantity: 200 },

  // condiments & sauces
  { name: "olive oil", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "vegetable oil", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "sesame oil", category: "condiments & sauces", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "soy sauce", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "fish sauce", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 1 },
  { name: "Worcestershire sauce", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 1 },
  { name: "hot sauce", category: "condiments & sauces", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "ketchup", category: "condiments & sauces", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "mayonnaise", category: "condiments & sauces", defaultUnit: "jar", defaultQuantity: 1 },
  { name: "Dijon mustard", category: "condiments & sauces", defaultUnit: "jar", defaultQuantity: 1 },
  { name: "whole grain mustard", category: "condiments & sauces", defaultUnit: "jar", defaultQuantity: 1 },
  { name: "balsamic vinegar", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "white wine vinegar", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 1 },
  { name: "apple cider vinegar", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 1 },
  { name: "tahini", category: "condiments & sauces", defaultUnit: "tbsp", defaultQuantity: 2 },
  { name: "pesto", category: "condiments & sauces", defaultUnit: "jar", defaultQuantity: 1 },
  { name: "sriracha", category: "condiments & sauces", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "peanut butter", category: "condiments & sauces", defaultUnit: "jar", defaultQuantity: 1 },

  // spices & herbs
  { name: "salt", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "black pepper", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "cumin", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "ground coriander", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "turmeric", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "smoked paprika", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "sweet paprika", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "chilli flakes", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "chilli powder", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "cinnamon", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "mixed spice", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "dried oregano", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "dried thyme", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "dried rosemary", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "bay leaves", category: "spices & herbs", defaultUnit: "", defaultQuantity: 2 },
  { name: "cardamom", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "ground cloves", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 0.5 },
  { name: "nutmeg", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 0.5 },
  { name: "curry powder", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 2 },
  { name: "garam masala", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "Chinese five spice", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "dried basil", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "dried parsley", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "fennel seeds", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },
  { name: "mustard seeds", category: "spices & herbs", defaultUnit: "tsp", defaultQuantity: 1 },

  // personal care
  { name: "shampoo", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "conditioner", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "shower gel", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "toothpaste", category: "personal care", defaultUnit: "tube", defaultQuantity: 1 },
  { name: "toothbrush", category: "personal care", defaultUnit: "", defaultQuantity: 1 },
  { name: "deodorant", category: "personal care", defaultUnit: "", defaultQuantity: 1 },
  { name: "moisturiser", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "face wash", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "hand soap", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "razor blades", category: "personal care", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "cotton pads", category: "personal care", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "lip balm", category: "personal care", defaultUnit: "", defaultQuantity: 1 },
  { name: "sunscreen", category: "personal care", defaultUnit: "bottle", defaultQuantity: 1 },

  // household & cleaning
  { name: "washing up liquid", category: "household & cleaning", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "dishwasher tablets", category: "household & cleaning", defaultUnit: "box", defaultQuantity: 1 },
  { name: "laundry detergent", category: "household & cleaning", defaultUnit: "box", defaultQuantity: 1 },
  { name: "fabric softener", category: "household & cleaning", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "all-purpose cleaner", category: "household & cleaning", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "bleach", category: "household & cleaning", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "toilet cleaner", category: "household & cleaning", defaultUnit: "bottle", defaultQuantity: 1 },
  { name: "bin bags", category: "household & cleaning", defaultUnit: "roll", defaultQuantity: 1 },
  { name: "kitchen roll", category: "household & cleaning", defaultUnit: "roll", defaultQuantity: 2 },
  { name: "toilet paper", category: "household & cleaning", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "foil", category: "household & cleaning", defaultUnit: "roll", defaultQuantity: 1 },
  { name: "cling film", category: "household & cleaning", defaultUnit: "roll", defaultQuantity: 1 },
  { name: "zip-lock bags", category: "household & cleaning", defaultUnit: "box", defaultQuantity: 1 },
  { name: "sponges", category: "household & cleaning", defaultUnit: "pack", defaultQuantity: 1 },

  // health & pharmacy
  { name: "paracetamol", category: "health & pharmacy", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "ibuprofen", category: "health & pharmacy", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "vitamin C", category: "health & pharmacy", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "vitamin D", category: "health & pharmacy", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "plasters", category: "health & pharmacy", defaultUnit: "box", defaultQuantity: 1 },
  { name: "antiseptic cream", category: "health & pharmacy", defaultUnit: "tube", defaultQuantity: 1 },
  { name: "eye drops", category: "health & pharmacy", defaultUnit: "bottle", defaultQuantity: 1 },

  // pet care
  { name: "dog food", category: "pet care", defaultUnit: "bag", defaultQuantity: 1 },
  { name: "cat food", category: "pet care", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "cat litter", category: "pet care", defaultUnit: "bag", defaultQuantity: 1 },
  { name: "pet treats", category: "pet care", defaultUnit: "bag", defaultQuantity: 1 },

  // other
  { name: "batteries AA", category: "other", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "batteries AAA", category: "other", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "birthday candles", category: "other", defaultUnit: "pack", defaultQuantity: 1 },
  { name: "gift wrap", category: "other", defaultUnit: "roll", defaultQuantity: 1 },
  { name: "greeting card", category: "other", defaultUnit: "", defaultQuantity: 1 },
];

async function main() {
  console.log(`Seeding ${products.length} products…`);

  let created = 0;
  let skipped = 0;

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { name: { equals: p.name, mode: "insensitive" } },
    });

    if (existing) {
      // Update defaults on existing records, preserving category (first-write wins)
      await prisma.product.update({
        where: { id: existing.id },
        data: { defaultUnit: p.defaultUnit, defaultQuantity: p.defaultQuantity },
      });
      skipped++;
    } else {
      await prisma.product.create({ data: p });
      created++;
    }
  }

  console.log(`Done. Created ${created}, updated ${skipped} existing products.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
