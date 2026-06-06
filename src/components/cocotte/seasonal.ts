export type CocotteTopper = "sprout" | "santa" | "pumpkin" | "flower";

export function getSeasonalTopper(): CocotteTopper {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const day = now.getDate();

  if (month === 12) return "santa";
  if (month === 10 && day >= 20) return "pumpkin"; // Oct 20–31 (Halloween run-up)
  if (month === 11 && day <= 2) return "pumpkin";  // Nov 1–2 (Día de los Muertos / All Saints)
  if ((month === 3 && day >= 20) || month === 4 || (month === 5 && day <= 15)) return "flower";
  return "sprout";
}
