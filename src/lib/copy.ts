import copyJson from "@/content/copy.json";

/**
 * Every piece of user-facing text in the app, grouped by screen. Edit the JSON
 * file, not the components — see docs/how-to-change-text.md.
 */
export const copy = copyJson;

/**
 * Replace `{name}` placeholders in a copy string: fill("Hi {name}", { name: "Sam" }).
 * Unknown placeholders are left as-is so a typo in the JSON is visible, not silent.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
