export type Product = {
  id: number;
  name: string;
  category: string;
  defaultUnit: string;
  defaultQuantity: number;
  source: string;
  displayName?: string;
};

export type ProductTranslation = {
  id: number;
  productId: number;
  locale: string;
  name: string;
};

export type RecipeTranslation = {
  id: string;
  recipeId: string;
  locale: string;
  name: string;
  instructions: string;
  notes: string;
  tags: string[];
};

export type RecipeIngredient = {
  id: number;
  quantity: number;
  unit: string;
  preparation: string;
  productId: number;
  recipeId: string;
  product: Product;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  instructions: string;
  tags: string[];
  favourite: boolean;
  notes: string;
  nativeLocale: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
};

export type ScheduledMealBrief = {
  id: number;
  servings: number;
  mealPlanEntryId: number | null;
};

export type MealPlanEntry = {
  id: number;
  targetServings: number;
  recipeId: string;
  recipe: Recipe;
  scheduledMeals: ScheduledMealBrief[];
};

export type ScheduledMeal = {
  id: number;
  date: string;
  mealType: "lunch" | "dinner";
  servings: number;
  note: string | null;
  mealPlanEntryId: number | null;
  mealPlanEntry: MealPlanEntry | null;
};

export type ShoppingListItem = {
  id: number;
  quantity: number;
  unit: string;
  product: Product;
};

export type RecipeFormData = {
  name: string;
  servings: number;
  instructions: string;
  tags: string[];
  favourite: boolean;
  notes: string;
  nativeLocale?: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    preparation: string;
    category: string;
    displayName?: string;
  }[];
};
