import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: COACH.storageState });

// The Workouts page: the coach's library of common (pre-made) workouts, with
// create, edit and delete — mirroring Exercises and Programmes.

test.describe.configure({ mode: "serial" });

let coachDb: SupabaseClient;

async function cleanup() {
  await coachDb.from("workouts").delete().is("programme_id", null).like("name", "E2E %");
}

test.beforeAll(async () => {
  coachDb = await signInAs(COACH.email, COACH.password);
  await cleanup();
});

test.afterAll(async () => {
  await cleanup();
});

test("Workouts is in the sidebar and lists common workouts", async ({ page }) => {
  await page.goto("/coach");
  await page.getByRole("link", { name: "Workouts" }).click();
  await expect(page).toHaveURL("/coach/workouts");
  await expect(page.getByRole("heading", { name: "Workouts" })).toBeVisible();
  await expect(page.getByText(/\d+ common workouts?/)).toBeVisible();
});

test("coach can create a common workout", async ({ page }) => {
  await page.goto("/coach/workouts");
  await page.getByRole("link", { name: /new workout/i }).click();
  await expect(page).toHaveURL("/coach/workouts/new");

  // Name and at least one exercise are required.
  await page.getByRole("button", { name: "Create workout" }).click();
  await expect(page.getByText("Workout name is required.")).toBeVisible();
  await page.getByLabel("Workout name").fill("E2E Push Day");
  await page.getByRole("button", { name: "Create workout" }).click();
  await expect(page.getByText("Add at least one exercise.")).toBeVisible();

  await page.getByRole("button", { name: "Add exercise" }).click();
  const exercise = page.getByRole("combobox", { name: "Exercise" });
  await exercise.click();
  await exercise.fill("bench");
  await page.getByRole("option", { name: /Dumbbell Bench Press/ }).click();
  await page.getByLabel("Sets").fill("4");
  await page.getByLabel("Reps", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Create workout" }).click();

  await expect(page).toHaveURL("/coach/workouts");
  const card = page.getByTestId("workout-card").filter({ hasText: "E2E Push Day" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("1 exercise · Dumbbell Bench Press 4×8");
});

test("coach can edit a common workout", async ({ page }) => {
  await page.goto("/coach/workouts");
  await page
    .getByTestId("workout-card")
    .filter({ hasText: "E2E Push Day" })
    .getByRole("link", { name: "Edit" })
    .click();
  await expect(page).toHaveURL(/\/coach\/workouts\/[0-9a-f-]{36}$/);
  await expect(page.getByLabel("Workout name")).toHaveValue("E2E Push Day");
  await expect(page.getByRole("combobox", { name: "Exercise" })).toHaveValue("Dumbbell Bench Press");

  await page.getByLabel("Workout name").fill("E2E Push Day (updated)");
  await page.getByLabel("Sets").fill("5");
  await page.getByRole("button", { name: "Save workout" }).click();

  await expect(page).toHaveURL("/coach/workouts");
  const card = page.getByTestId("workout-card").filter({ hasText: "E2E Push Day (updated)" });
  await expect(card).toContainText("Dumbbell Bench Press 5×8");

  // The edited workout is offered by the programme editor's chooser.
  await page.goto("/coach/programmes/new");
  await page.getByRole("button", { name: "Add workout" }).click();
  await expect(
    page.getByTestId("add-workout-chooser").getByRole("button", { name: /E2E Push Day \(updated\)/ })
  ).toBeVisible();
});

test("coach can delete a common workout from the list", async ({ page }) => {
  await page.goto("/coach/workouts");
  const card = page.getByTestId("workout-card").filter({ hasText: "E2E Push Day (updated)" });
  await card.getByRole("button", { name: "Delete" }).click();
  await card.getByRole("button", { name: "Confirm delete" }).click();

  await expect(page.getByText("E2E Push Day (updated)")).not.toBeVisible();
  const { data } = await coachDb
    .from("workouts")
    .select("id")
    .is("programme_id", null)
    .eq("name", "E2E Push Day (updated)");
  expect(data).toHaveLength(0);
});

test("deleting a common workout leaves programmes that used it intact", async ({ page }) => {
  const { data: tmpl } = await coachDb
    .from("workouts")
    .insert({ programme_id: null, name: "E2E Doomed Common", order_num: 0 })
    .select("id")
    .single();
  const { data: prog } = await coachDb
    .from("programmes")
    .insert({ name: "E2E Uses Common" })
    .select("id")
    .single();
  await coachDb.from("workouts").insert({
    programme_id: prog!.id,
    name: "E2E Doomed Common",
    order_num: 1,
    source_workout_id: tmpl!.id,
  });

  await page.goto(`/coach/workouts/${tmpl!.id}`);
  await page.getByRole("button", { name: "Delete workout" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page).toHaveURL("/coach/workouts");

  const { data: kept } = await coachDb
    .from("workouts")
    .select("name, source_workout_id")
    .eq("programme_id", prog!.id);
  expect(kept).toEqual([{ name: "E2E Doomed Common", source_workout_id: null }]);
  await coachDb.from("programmes").delete().eq("id", prog!.id);
});
