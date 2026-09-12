import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: COACH.storageState });

// FR-4.4: duplicating a programme creates a new template (Phase 2 from
// Phase 1). The copy stays in the library until cleanup deletes it —
// workouts and workout_exercises cascade with the programme row.

let coachDb: SupabaseClient;

async function deleteCopies() {
  await coachDb.from("programmes").delete().is("client_id", null).like("name", "%(copy)");
}

test.beforeAll(async () => {
  coachDb = await signInAs(COACH.email, COACH.password);
  await deleteCopies(); // strays from an earlier aborted run
});

test.afterAll(async () => {
  await deleteCopies();
});

test("duplicating a programme adds a full copy to the library", async ({ page }) => {
  await page.goto("/coach/programmes");
  await expect(page.getByRole("heading", { name: "Full Body Phase 1", exact: true })).toBeVisible();

  // Cards are ordered by phase, so the first Duplicate button is Phase 1's.
  await page.getByRole("button", { name: /duplicate/i }).first().click();

  await expect(page.getByRole("heading", { name: "Full Body Phase 1 (copy)" })).toBeVisible();
  // The copy carries the workouts across, so each Phase 1 workout now
  // appears twice on the page.
  await expect(page.getByText("Workout A — Lower Focus")).toHaveCount(2);
  await expect(page.getByText("Workout B — Upper Focus")).toHaveCount(2);
  await expect(page.getByText("Workout C — Full Body")).toHaveCount(2);

  // It is a template (client_id null), so it can be assigned to clients:
  // it must show up in a client detail page's assign dropdown.
  await page.goto("/coach/clients");
  await page.getByRole("link", { name: /Sarah Johnson/ }).click();
  await page.getByRole("button", { name: "Assign a new programme" }).click();
  await expect(
    page.getByRole("link", { name: "Full Body Phase 1 (copy)", exact: true })
  ).toBeVisible();
});
