export type Product = {
  id: number;
  name: string;
  category: string;
  defaultUnit: string;
  defaultQuantity: number;
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
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
};

export type ScheduledMealBrief = {
  id: number;
  servings: number;
  mealPlanEntryId: number;
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
  mealPlanEntryId: number;
  mealPlanEntry: MealPlanEntry;
};

export type GroceryItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
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
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    preparation: string;
    category: string;
  }[];
};
