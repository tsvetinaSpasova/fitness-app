import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLIENT } from "./credentials";
import { signInAs, userId } from "./db";

test.use({ storageState: CLIENT.storageState });

// FR-6.1: clients log body measurements. Sarah's seeded history has 68 kg as
// the latest entry, so logging a distinctive 63.7 kg lets us assert the tile,
// the delta against the previous entry, and the history row — then cleanup
// deletes exactly that row so the seeded reads elsewhere stay stable.

const TEST_WEIGHT = 63.7;
let sarahDb: SupabaseClient;

async function deleteTestMeasurements() {
  await sarahDb
    .from("measurements")
    .delete()
    .eq("client_id", await userId(sarahDb))
    .eq("weight_kg", TEST_WEIGHT);
}

test.beforeAll(async () => {
  sarahDb = await signInAs(CLIENT.email, CLIENT.password);
  await deleteTestMeasurements();
});

test.afterAll(async () => {
  await deleteTestMeasurements();
});

test("save is disabled until a value is entered", async ({ page }) => {
  await page.goto("/client/progress");
  await page.getByRole("button", { name: /log/i }).click();
  await expect(page.getByText("Log measurements")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("logging a measurement updates the tiles, delta and history", async ({ page }) => {
  await page.goto("/client/progress");
  await page.getByRole("button", { name: /log/i }).click();
  await expect(page.getByText("Log measurements")).toBeVisible();

  // Form fields in order: Weight, Waist, Hips, Chest, Arms, Legs.
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill(String(TEST_WEIGHT));
  await inputs.nth(1).fill("74.5");
  await inputs.nth(4).fill("30.5");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Latest tile shows the new weight…
  await expect(page.getByText(/63\.7/).first()).toBeVisible();
  // …with the delta vs the previous (seeded 68 kg) entry…
  await expect(page.getByText(/4\.3 kg vs last/)).toBeVisible();
  // …and the history gains a row for it.
  await expect(page.getByText("63.7 kg", { exact: true })).toBeVisible();
  // Arms (FR-6.1) get their own tile now too.
  await expect(page.getByText("Arms", { exact: true })).toBeVisible();
  await expect(page.getByText(/30\.5/).first()).toBeVisible();
});
