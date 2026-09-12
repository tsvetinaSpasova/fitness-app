import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: COACH.storageState });

// Common (pre-made) workouts: "Save as common" stores a workout in the
// library, "Add workout" offers custom vs. a common one, and an untouched
// pick keeps "Save as common" inactive. Everything is namespaced "E2E …".

test.describe.configure({ mode: "serial" });

let coachDb: SupabaseClient;

async function cleanup() {
  await coachDb.from("programmes").delete().is("client_id", null).like("name", "E2E Common%");
  await coachDb.from("workouts").delete().is("programme_id", null).like("name", "E2E %");
}

test.beforeAll(async () => {
  coachDb = await signInAs(COACH.email, COACH.password);
  await cleanup();
});

test.afterAll(async () => {
  await cleanup();
});

test("'Save as common' stores the workout in the library", async ({ page }) => {
  await page.goto("/coach/programmes/new");
  await page.getByLabel("Workout name").fill("E2E Leg Day");

  await page.getByRole("button", { name: "Add exercise" }).click();
  const exercise = page.getByRole("combobox", { name: "Exercise" });
  await exercise.click();
  await exercise.fill("goblet");
  await page.getByRole("option", { name: /Goblet Squat/ }).click();
  await page.getByLabel("Sets").fill("4");
  await page.getByLabel("Reps", { exact: true }).fill("6");

  const saveCommon = page.getByRole("button", { name: "Save as common" });
  await expect(saveCommon).toBeEnabled();
  await saveCommon.click();
  // Once stored, the workout is an unchanged common one: nothing to save.
  await expect(page.getByRole("button", { name: "Saved as common" })).toBeDisabled();

  const { data: rows } = await coachDb
    .from("workouts")
    .select("id, workout_exercises(sets, reps)")
    .is("programme_id", null)
    .eq("name", "E2E Leg Day");
  expect(rows).toHaveLength(1);
  expect(rows![0].workout_exercises).toEqual([{ sets: 4, reps: 6 }]);
});

test("'Add workout' offers custom or a common workout, and tracks edits", async ({ page }) => {
  await page.goto("/coach/programmes/new");
  await page.getByLabel("Programme name").fill("E2E Common Block");

  await page.getByRole("button", { name: "Add workout" }).click();
  const chooser = page.getByTestId("add-workout-chooser");
  await expect(chooser.getByText("Add a workout")).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Custom workout" })).toBeVisible();
  await chooser.getByRole("button", { name: /E2E Leg Day · 1 exercise/ }).click();

  // The pick arrives prefilled and is inactive for "Save as common".
  const names = page.getByLabel("Workout name");
  await expect(names).toHaveCount(2);
  await expect(names.nth(1)).toHaveValue("E2E Leg Day");
  await expect(page.getByRole("combobox", { name: "Exercise" })).toHaveValue("Goblet Squat");
  await expect(page.getByLabel("Sets")).toHaveValue("4");
  await expect(page.getByRole("button", { name: "Saved as common" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save as common" })).toHaveCount(1); // Workout 1

  // Any change activates it; undoing the change deactivates it again.
  await page.getByLabel("Reps", { exact: true }).fill("8");
  await expect(page.getByRole("button", { name: "Save as common" })).toHaveCount(2);
  await page.getByLabel("Reps", { exact: true }).fill("6");
  await expect(page.getByRole("button", { name: "Saved as common" })).toBeDisabled();

  // A custom workout starts blank.
  await page.getByRole("button", { name: "Add workout" }).click();
  await chooser.getByRole("button", { name: "Custom workout" }).click();
  await expect(names).toHaveCount(3);
  await expect(names.nth(2)).toHaveValue("Workout 3");

  await page.getByRole("button", { name: "Create programme" }).click();
  await expect(page).toHaveURL("/coach/programmes");

  // The link to the common workout survives a save + reopen.
  const { data: prog } = await coachDb
    .from("programmes")
    .select("id, workouts(name, source_workout_id)")
    .eq("name", "E2E Common Block")
    .is("client_id", null)
    .single();
  const { data: template } = await coachDb
    .from("workouts")
    .select("id")
    .is("programme_id", null)
    .eq("name", "E2E Leg Day")
    .single();
  const linked = prog!.workouts.find((w: { name: string }) => w.name === "E2E Leg Day");
  expect(linked?.source_workout_id).toBe(template!.id);

  await page.goto(`/coach/programmes/${prog!.id}`);
  await expect(page.getByRole("button", { name: "Saved as common" })).toBeDisabled();

  // Editing the pick and saving as common again replaces the library copy.
  await page.getByLabel("Reps", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Save as common" }).nth(1).click();
  await expect(page.getByRole("button", { name: "Saved as common" })).toBeDisabled();
  const { data: after } = await coachDb
    .from("workouts")
    .select("id, workout_exercises(reps)")
    .is("programme_id", null)
    .eq("name", "E2E Leg Day");
  expect(after).toHaveLength(1);
  expect(after![0].workout_exercises).toEqual([{ reps: 8 }]);
});

test("a common workout without exercises can't be saved", async ({ page }) => {
  await page.goto("/coach/programmes/new");
  await page.getByLabel("Workout name").fill("E2E Empty");
  await page.getByRole("button", { name: "Save as common" }).click();
  await expect(page.getByText(/add at least one exercise/i)).toBeVisible();
});
