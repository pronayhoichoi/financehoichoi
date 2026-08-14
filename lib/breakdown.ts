import type {
  ElementCategory,
  SceneInt,
  SceneTime,
} from "@/app/generated/prisma/client";

export const ELEMENT_CATEGORIES: ElementCategory[] = [
  "CAST",
  "EXTRAS",
  "PROPS",
  "WARDROBE",
  "MAKEUP",
  "VEHICLES",
  "SFX",
  "STUNTS",
  "ART",
  "EQUIPMENT",
  "LOCATION",
  "MISC",
];

export const ELEMENT_LABEL: Record<ElementCategory, string> = {
  CAST: "Cast",
  EXTRAS: "Extras",
  PROPS: "Props",
  WARDROBE: "Wardrobe",
  MAKEUP: "Hair & Makeup",
  VEHICLES: "Vehicles",
  SFX: "SFX / VFX",
  STUNTS: "Stunts",
  ART: "Art / Set",
  EQUIPMENT: "Equipment",
  LOCATION: "Location",
  MISC: "Misc",
};

export const SCENE_INT_LABEL: Record<SceneInt, string> = {
  INT: "INT",
  EXT: "EXT",
  INT_EXT: "INT/EXT",
};

export const SCENE_TIME_LABEL: Record<SceneTime, string> = {
  DAY: "DAY",
  NIGHT: "NIGHT",
  DAWN: "DAWN",
  DUSK: "DUSK",
};

/** "12" eighths → "1 4/8". */
export function formatEighths(eighths?: number | null): string {
  if (!eighths || eighths <= 0) return "—";
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (whole === 0) return `${rem}/8`;
  if (rem === 0) return `${whole}`;
  return `${whole} ${rem}/8`;
}
