/**
 * "How to measure" content (FR-6.2). Numbers only tell a story when they are
 * taken the same way every time, so each guide spells out where the tape goes
 * and what to avoid. `videoUrl` is an optional YouTube demo; the guide page
 * embeds it via youTubeEmbedUrl when set and falls back to the written steps.
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

export const GENERAL_TIPS = [
  "Measure first thing in the morning, after the bathroom and before eating or drinking.",
  "Use the same soft tape measure and the same spot every time — consistency matters more than perfection.",
  "Keep the tape flat and snug against the skin, but not digging in.",
  "Relax: stand tall, breathe out normally and don't flex or suck in.",
  "Measure once every 1–2 weeks. Day-to-day changes are mostly water, not progress.",
];

export const MEASUREMENT_GUIDES: MeasurementGuide[] = [
  {
    key: "weight",
    label: "Weight",
    unit: "kg",
    where: "On the same scale, same time of day, minimal clothing.",
    steps: [
      "Place the scale on a hard, flat floor — never carpet.",
      "Weigh yourself first thing in the morning, after the bathroom and before food or drink.",
      "Wear the same (or no) clothing each time and stand still with weight spread evenly on both feet.",
      "Record the number to one decimal place if your scale shows it.",
    ],
    tips: [
      "Weight swings 1–2 kg day to day from water, salt and carbs — look at the weekly trend, not a single reading.",
      "Don't weigh yourself after a workout, a big meal or a night out; those numbers aren't comparable.",
    ],
  },
  {
    key: "waist",
    label: "Waist",
    unit: "cm",
    where: "Around the narrowest point of your torso, roughly level with your belly button.",
    steps: [
      "Stand up straight with your feet together and your top lifted out of the way.",
      "Find your natural waist — the narrowest point between your ribs and hips, usually at or just above the navel.",
      "Wrap the tape around, keeping it level all the way round (check in a mirror).",
      "Breathe out normally, let your stomach relax, then read the number where the tape overlaps.",
    ],
    tips: [
      "Don't suck in or push out — a relaxed belly is the only repeatable one.",
      "If your narrowest point is hard to find, use the belly button as the landmark every time.",
    ],
  },
  {
    key: "hips",
    label: "Hips",
    unit: "cm",
    where: "Around the widest part of your glutes, measured from the side.",
    steps: [
      "Stand with your feet together and your weight evenly balanced.",
      "Wrap the tape around the fullest part of your hips and glutes — this is usually lower than you expect.",
      "Look sideways in a mirror to make sure the tape is level front to back.",
      "Read the number without pulling the tape tight.",
    ],
    tips: [
      "Measure over thin underwear or bare skin; joggers and jeans add centimetres.",
      "Slide the tape up and down slightly and take the largest reading — that's the true hip line.",
    ],
  },
  {
    key: "chest",
    label: "Chest",
    unit: "cm",
    where: "Around the fullest part of your chest, at nipple level, under the arms.",
    steps: [
      "Stand relaxed with your arms down by your sides once the tape is in place.",
      "Wrap the tape around your back and across the fullest part of your chest, roughly nipple height.",
      "Keep the tape level across your shoulder blades — it tends to slip down at the back.",
      "Breathe out normally and read the number.",
    ],
    tips: [
      "Don't puff your chest out or flex — you'll only be measuring how well you posed.",
      "Ask someone to help if the tape keeps dropping at the back; it makes a big difference to accuracy.",
    ],
  },
  {
    key: "arms",
    label: "Arms",
    unit: "cm",
    where: "Around the thickest part of your upper arm, relaxed, halfway between shoulder and elbow.",
    steps: [
      "Let your arm hang loose by your side, completely relaxed.",
      "Find the midpoint between the tip of your shoulder and your elbow — that's usually the fullest part of the bicep.",
      "Wrap the tape around at that point, keeping it perpendicular to the arm.",
      "Measure the same arm each time (we suggest your dominant arm) and record it.",
    ],
    tips: [
      "Always measure unflexed — flexed readings vary far more with effort and pump.",
      "Don't measure straight after training arms; a pump can add a centimetre or more.",
    ],
  },
  {
    key: "legs",
    label: "Legs",
    unit: "cm",
    where: "Around the thickest part of your thigh, standing, just below the glute crease.",
    steps: [
      "Stand with your feet about shoulder-width apart and your weight evenly split between both legs.",
      "Find the widest part of your thigh, usually a few centimetres below where your glute meets your leg.",
      "Wrap the tape around the thigh, keeping it level all the way round.",
      "Measure the same leg each time and record it.",
    ],
    tips: [
      "Don't stand with all your weight on the measured leg — it changes the muscle shape.",
      "Measure before training, not after; a leg session leaves your quads swollen for hours.",
    ],
  },
];

export function getMeasurementGuide(key: MeasurementGuide["key"]) {
  return MEASUREMENT_GUIDES.find((g) => g.key === key)!;
}

export const HOW_TO_MEASURE_PATH = "/client/progress/how-to-measure";
