import { test, expect } from "@playwright/test";
import { CLIENT } from "./credentials";

test.use({ storageState: CLIENT.storageState });

test.describe("Client — workouts home", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client");
  });

  test("shows greeting and client name", async ({ page }) => {
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: CLIENT.name })).toBeVisible();
  });

  test("shows the assigned programme with its workouts", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Full Body Phase 1" })).toBeVisible();
    await expect(page.getByText("Phase 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Workout A — Lower Focus").first()).toBeVisible();
    await expect(page.getByText("Workout B — Upper Focus").first()).toBeVisible();
    await expect(page.getByText("Workout C — Full Body").first()).toBeVisible();
  });

  test("shows weekly workout count", async ({ page }) => {
    await expect(page.getByText(/\d+ workouts? this week/)).toBeVisible();
  });

  test("shows recent workouts section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recent Workouts" })).toBeVisible();
  });

  test("recent workouts show per-exercise performed sets", async ({ page }) => {
    // Set chips ("16kg × 10") only render inside the recent-logs cards, so
    // this proves the exercise-instance detail is on the home page too.
    await expect(page.getByText(/\d+(\.\d+)?kg × \d+/).first()).toBeVisible();
  });

  test("navigates into a workout", async ({ page }) => {
    await page.getByRole("link", { name: /Workout A — Lower Focus/ }).click();
    await expect(page).toHaveURL(/\/client\/workout\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
  });

  test("bottom navigation is present", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Workouts" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Progress" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Photos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
  });
});
