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
