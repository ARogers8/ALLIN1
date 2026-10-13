export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export type UnitSystem = "IMPERIAL" | "METRIC";

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

export function displayWeight(kg: number, units: UnitSystem, digits = 1): number {
  const v = units === "IMPERIAL" ? kgToLb(kg) : kg;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export function toKg(value: number, units: UnitSystem): number {
  return units === "IMPERIAL" ? lbToKg(value) : value;
}

export const weightUnit = (units: UnitSystem) => (units === "IMPERIAL" ? "lb" : "kg");

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === "METRIC") return `${Math.round(cm)} cm`;
  const totalIn = Math.round(cm / CM_PER_IN);
  return `${Math.floor(totalIn / 12)}′${totalIn % 12}″`;
}
