export type Ingredient = {
  id: number;
  name: string;
  category: string;
};

export type RecipeIngredient = {
  id: number;
  quantity: number;
  unit: string;
  preparation: string;
  ingredientId: number;
  recipeId: string;
  ingredient: Ingredient;
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

export type MealPlanEntry = {
  id: number;
  targetServings: number;
  recipeId: string;
  recipe: Recipe;
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
  ingredient: Ingredient;
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
