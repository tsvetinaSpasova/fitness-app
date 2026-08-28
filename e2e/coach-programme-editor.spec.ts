import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH, ASSIGN_CLIENT } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: COACH.storageState });

// FR-4.1/4.2 (create a programme with workouts + exercises), FR-4.7 (edit a
// client's assigned copy without touching the template), and template delete.
// All created data is namespaced "E2E …" and removed again in afterAll;
// James's copy is restored by re-assigning him a fresh Full Body Phase 2.

test.describe.configure({ mode: "serial" });

let coachDb: SupabaseClient;
let jamesId: string;

async function deleteTestTemplates() {
  await coachDb.from("programmes").delete().is("client_id", null).like("name", "E2E %");
}

test.beforeAll(async () => {
  coachDb = await signInAs(COACH.email, COACH.password);
  await deleteTestTemplates();

  const { data: james } = await coachDb
    .from("profiles")
    .select("id")
    .eq("email", ASSIGN_CLIENT.email)
    .single();
  jamesId = james!.id;
});

test.afterAll(async () => {
  await deleteTestTemplates();

  // Restore James to a pristine Full Body Phase 2 copy and drop the copy the
  // edit test customised (plus any older leftovers).
  const { data: template } = await coachDb
    .from("programmes")
    .select("id")
    .eq("name", "Full Body Phase 2")
    .is("client_id", null)
    .single();
  const { data: fresh } = await coachDb.rpc("copy_programme_for_client", {
    template_id: template!.id,
    target_client_id: jamesId,
  });
  await coachDb.from("programmes").delete().eq("client_id", jamesId).neq("id", fresh);
});

test("coach can create a programme with workouts and exercises", async ({ page }) => {
  await page.goto("/coach/programmes");
  await page.getByRole("button", { name: /new programme/i }).click();
  await expect(page).toHaveURL("/coach/programmes/new");

  await page.getByLabel("Programme name").fill("E2E Strength Block");
  await page.getByLabel("Phase").fill("3");
  await page.getByLabel("Workout name").fill("E2E Day 1");

  // The exercise picker is a searchable combobox: typing filters the list.
  await page.getByRole("button", { name: "Add exercise" }).click();
  const firstExercise = page.getByRole("combobox", { name: "Exercise" });
  await firstExercise.click();
  await firstExercise.fill("goblet");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.getByRole("option", { name: /Goblet Squat/ }).click();
  await expect(firstExercise).toHaveValue("Goblet Squat");
  await page.getByLabel("Sets").fill("4");
  await page.getByLabel("Reps", { exact: true }).fill("6");
  await page.getByLabel("Weight kg").fill("20"); // optional target weight
  await page.getByLabel("Rest seconds").fill("120");

  // Second exercise uses a per-set pyramid scheme instead of uniform reps.
  await page.getByRole("button", { name: "Add exercise" }).click();
  const secondExercise = page.getByRole("combobox", { name: "Exercise" }).nth(1);
  await secondExercise.click();
  await secondExercise.fill("hip");
  await page.getByRole("option", { name: /Hip Thrust/ }).click();
  await expect(secondExercise).toHaveValue("Hip Thrust");
  await page.getByRole("button", { name: "Vary per set" }).nth(1).click();
  await page.getByLabel("Set 1 reps", { exact: true }).fill("12");
  await page.getByLabel("Set 1 weight", { exact: true }).fill("40");
  await page.getByLabel("Set 2 reps", { exact: true }).fill("10");
  await page.getByLabel("Set 3 reps", { exact: true }).fill("8");

  await page.getByRole("button", { name: "Create programme" }).click();
  await expect(page).toHaveURL("/coach/programmes");
  await expect(page.getByRole("heading", { name: "E2E Strength Block" })).toBeVisible();
  await expect(page.getByText("Phase 3", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Day 1")).toBeVisible();
});

test("create validates that a name is required", async ({ page }) => {
  await page.goto("/coach/programmes/new");
  await page.getByRole("button", { name: "Create programme" }).click();
  await expect(page.getByText("Programme name is required.")).toBeVisible();
});

test("coach can edit a template: rename workout, change reps, reorder exercises", async ({ page }) => {
  const { data } = await coachDb
    .from("programmes")
    .select("id")
    .eq("name", "E2E Strength Block")
    .is("client_id", null)
    .single();
  await page.goto(`/coach/programmes/${data!.id}`);
  await expect(page.getByLabel("Programme name")).toHaveValue("E2E Strength Block");

  await page.getByLabel("Reps", { exact: true }).fill("8"); // Goblet Squat row (Hip Thrust varies)
  await page.getByLabel("Move exercise up").nth(1).click(); // Hip Thrust to the top
  await page.getByLabel("Workout name").fill("E2E Day 1 (updated)");
  await page.getByRole("button", { name: "Save programme" }).click();

  await expect(page).toHaveURL("/coach/programmes");
  await expect(page.getByText("E2E Day 1 (updated)")).toBeVisible();

  // Reopen: order, reps, target weight, and the per-set scheme all persisted.
  await page.goto(`/coach/programmes/${data!.id}`);
  const comboboxes = page.getByRole("combobox", { name: "Exercise" });
  await expect(comboboxes.nth(0)).toHaveValue("Hip Thrust");
  await expect(comboboxes.nth(1)).toHaveValue("Goblet Squat");
  await expect(page.getByLabel("Reps", { exact: true })).toHaveValue("8");
  await expect(page.getByLabel("Weight kg")).toHaveValue("20");
  await expect(page.getByText("varies").first()).toBeVisible();
  await expect(page.getByLabel("Set 1 reps", { exact: true })).toHaveValue("12");
  await expect(page.getByLabel("Set 1 weight", { exact: true })).toHaveValue("40");
  await expect(page.getByLabel("Set 3 reps", { exact: true })).toHaveValue("8");
});

test("clicking a workout in the library opens the editor at that workout", async ({ page }) => {
  await page.goto("/coach/programmes");
  await page.getByRole("link", { name: /E2E Day 1 \(updated\)/ }).click();
  await expect(page).toHaveURL(/\/coach\/programmes\/[0-9a-f-]{36}#workout-[0-9a-f-]{36}/);
  await expect(page.getByLabel("Programme name")).toHaveValue("E2E Strength Block");
});

test("coach can edit a client's copy without touching the template (FR-4.7)", async ({ page }) => {
  await page.goto(`/coach/clients/${jamesId}`);
  await page.getByRole("link", { name: "Edit" }).click();

  await expect(page).toHaveURL(/\/coach\/programmes\/[0-9a-f-]{36}/);
  await expect(page.getByText(/James Patel's personal copy/)).toBeVisible();

  await page.getByLabel("Workout name").first().fill("E2E Custom Lower");
  await page.getByRole("button", { name: "Save programme" }).click();

  // Saving a client copy returns to that client, and the change shows there.
  await expect(page).toHaveURL(`/coach/clients/${jamesId}`);
  await expect(page.getByText("E2E Custom Lower")).toBeVisible();

  // The Phase 2 template still has its original workout names.
  const { data: copy } = await coachDb
    .from("profiles")
    .select("assigned_programme_id")
    .eq("id", jamesId)
    .single();
  const { data: progRow } = await coachDb
    .from("programmes")
    .select("original_programme_id")
    .eq("id", copy!.assigned_programme_id!)
    .single();
  const { data: templateWorkouts } = await coachDb
    .from("workouts")
    .select("name")
    .eq("programme_id", progRow!.original_programme_id!);
  const names = templateWorkouts!.map((w) => w.name);
  expect(names).toContain("Workout A — Lower Power");
  expect(names).not.toContain("E2E Custom Lower");
});

test("coach can delete a template from the editor", async ({ page }) => {
  const { data: prog } = await coachDb
    .from("programmes")
    .insert({ name: "E2E Delete Me", phase: 9 })
    .select("id")
    .single();
  await coachDb
    .from("workouts")
    .insert({ programme_id: prog!.id, name: "E2E Doomed Workout", order_num: 1 });

  await page.goto(`/coach/programmes/${prog!.id}`);
  await page.getByRole("button", { name: "Delete programme" }).click();
  // Two-step inline confirm instead of a blocking browser dialog.
  await page.getByRole("button", { name: "Confirm delete" }).click();

  await expect(page).toHaveURL("/coach/programmes");
  await expect(page.getByRole("heading", { name: "E2E Delete Me" })).not.toBeVisible();

  const { data: gone } = await coachDb.from("programmes").select("id").eq("id", prog!.id);
  expect(gone).toHaveLength(0);
});
