import { copy } from "@/lib/copy";

/**
 * "How to measure" content (FR-6.2). Numbers only tell a story when they are
 * taken the same way every time, so each guide spells out where the tape goes
 * and what to avoid. `videoUrl` is an optional YouTube demo; the guide page
 * embeds it via youTubeEmbedUrl when set and falls back to the written steps.
 *
 * The text itself lives in src/content (measurementGuide.*) so it can be edited
 * without touching code; this module only types and exposes it.
 */
export interface MeasurementGuide {
  /** Anchor id on the guide page and the key used by the log form's help links. */
  key: "weight" | "waist" | "hips" | "chest" | "arms" | "legs";
  label: string;
  unit: "kg" | "cm";
  /** One line shown in the overview and next to the form field. */
  where: string;
  steps: string[];
  tips: string[];
  videoUrl?: string;
}

const GUIDE_KEYS: MeasurementGuide["key"][] = ["weight", "waist", "hips", "chest", "arms", "legs"];
const UNITS: MeasurementGuide["unit"][] = ["kg", "cm"];

function isGuideKey(value: string): value is MeasurementGuide["key"] {
  return (GUIDE_KEYS as string[]).includes(value);
}

function isUnit(value: string): value is MeasurementGuide["unit"] {
  return (UNITS as string[]).includes(value);
}

export const GENERAL_TIPS: string[] = copy.measurementGuide.generalTips;

export const MEASUREMENT_GUIDES: MeasurementGuide[] = copy.measurementGuide.guides.map((g) => {
  if (!isGuideKey(g.key)) throw new Error(`Unknown measurement guide key "${g.key}" in copy`);
  if (!isUnit(g.unit)) throw new Error(`Unknown measurement unit "${g.unit}" in copy`);
  return { ...g, key: g.key, unit: g.unit };
});

export function getMeasurementGuide(key: MeasurementGuide["key"]) {
  return MEASUREMENT_GUIDES.find((g) => g.key === key)!;
}

export const HOW_TO_MEASURE_PATH = "/client/progress/how-to-measure";
