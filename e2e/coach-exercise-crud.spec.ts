import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: COACH.storageState });

// FR-3.1/3.2/3.3: the coach maintains the exercise library — name, technique
// video, instructions, and alternatives. The seeded read-only checks live in
// coach-exercises.spec.ts; this file exercises the actual create/edit flow
// with a throwaway "E2E …" exercise that cleanup removes again.

let coachDb: SupabaseClient;

async function deleteTestExercises() {
  await coachDb.from("exercises").delete().like("name", "E2E %");
}

test.beforeAll(async () => {
  coachDb = await signInAs(COACH.email, COACH.password);
  await deleteTestExercises();
});

test.afterAll(async () => {
  await deleteTestExercises();
});

test.describe.configure({ mode: "serial" });

test("coach can add an exercise with video and alternatives", async ({ page }) => {
  await page.goto("/coach/exercises");
  await page.getByRole("button", { name: /add exercise/i }).click();

  await page.getByPlaceholder("Name *").fill("E2E Cable Crunch");
  await page.getByPlaceholder("Muscle group *").fill("E2E-Core");
  await page.getByPlaceholder("Instructions").fill("Kneel below a cable, crunch down against the weight.");
  await page.getByPlaceholder("Video URL").fill("https://example.com/cable-crunch.mp4");
  await page.getByPlaceholder(/alternatives/i).fill("Plank, Sit Up");
  await page.getByRole("button", { name: /save exercise/i }).click();

  // The new exercise appears with its muscle-group filter tab.
  await expect(page.getByText("E2E Cable Crunch", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "E2E-Core", exact: true }).click();

  // Filtered down to just our exercise: badge, alternatives, video link.
  await expect(page.getByText("E2E Cable Crunch", { exact: true })).toBeVisible();
  await expect(page.getByText("Goblet Squat", { exact: true })).not.toBeVisible();
  await expect(page.getByText("Plank")).toBeVisible();
  await expect(page.getByText("Sit Up")).toBeVisible();
  const videoLink = page.getByRole("link", { name: /video/i });
  await expect(videoLink).toBeVisible();
  await expect(videoLink).toHaveAttribute("href", "https://example.com/cable-crunch.mp4");
});

test("coach can edit an exercise", async ({ page }) => {
  await page.goto("/coach/exercises");
  await page.getByRole("button", { name: "E2E-Core", exact: true }).click();
  await page.getByRole("button", { name: "Edit" }).click();

  const nameInput = page.getByPlaceholder("Name *");
  await expect(nameInput).toHaveValue("E2E Cable Crunch");
  await nameInput.fill("E2E Kneeling Cable Crunch");
  await page.getByRole("button", { name: /save exercise/i }).click();

  await expect(page.getByText("E2E Kneeling Cable Crunch", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Cable Crunch", { exact: true })).not.toBeVisible();
});

test("an exercise used in workouts can't be deleted", async ({ page }) => {
  await page.goto("/coach/exercises");
  // Goblet Squat is prescribed in seeded workouts; match the title, not the
  // alternatives chips that also mention it.
  const row = page
    .getByTestId("exercise-row")
    .filter({ has: page.locator("p.font-semibold", { hasText: "Goblet Squat" }) });
  await expect(row.getByRole("button", { name: "Delete" })).toBeDisabled();
  await expect(row.getByText(/used in \d+ workouts?, so it can't be deleted/i)).toBeVisible();
});

test("coach can delete an unused exercise", async ({ page }) => {
  await page.goto("/coach/exercises");
  await page.getByRole("button", { name: "E2E-Core", exact: true }).click();
  const row = page.getByTestId("exercise-row").filter({ hasText: "E2E Kneeling Cable Crunch" });
  await row.getByRole("button", { name: "Delete" }).click();
  await row.getByRole("button", { name: "Confirm delete" }).click();

  await expect(page.getByText("E2E Kneeling Cable Crunch", { exact: true })).not.toBeVisible();
  const { data } = await coachDb.from("exercises").select("id").eq("name", "E2E Kneeling Cable Crunch");
  expect(data).toHaveLength(0);
});

test("deleting a logged exercise keeps the client's history readable", async ({ page }) => {
  // A throwaway exercise with a log against it: the log survives the delete
  // and still shows the exercise's name (snapshotted on exercise_logs).
  const { data: ex } = await coachDb
    .from("exercises")
    .insert({ name: "E2E Logged Once", muscle_group: "E2E-Core" })
    .select("id")
    .single();
  const { data: sarah } = await coachDb
    .from("profiles")
    .select("id")
    .eq("email", (await import("./credentials")).CLIENT.email)
    .single();
  const { data: log } = await coachDb
    .from("workout_logs")
    .insert({
      client_id: sarah!.id,
      workout_name: "E2E Log",
      programme_name: "E2E",
      status: "completed",
    })
    .select("id")
    .single();
  const { data: exLog } = await coachDb
    .from("exercise_logs")
    .insert({ workout_log_id: log!.id, exercise_id: ex!.id, exercise_name: "E2E Logged Once" })
    .select("id")
    .single();
  await coachDb.from("set_logs").insert({ exercise_log_id: exLog!.id, set_number: 1, reps: 5, weight_kg: 10 });

  await page.goto("/coach/exercises");
  await page.getByRole("button", { name: "E2E-Core", exact: true }).click();
  const row = page.getByTestId("exercise-row").filter({ hasText: "E2E Logged Once" });
  await row.getByRole("button", { name: "Delete" }).click();
  await row.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText("E2E Logged Once", { exact: true })).not.toBeVisible();

  const { data: after } = await coachDb
    .from("exercise_logs")
    .select("exercise_id, exercise_name")
    .eq("id", exLog!.id)
    .single();
  expect(after).toEqual({ exercise_id: null, exercise_name: "E2E Logged Once" });
  await coachDb.from("workout_logs").delete().eq("id", log!.id);
});
