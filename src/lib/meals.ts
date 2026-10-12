export type MealKey = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export const MEALS: { key: MealKey; label: string }[] = [
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
  { key: "SNACK", label: "Snacks" },
];
