import { test, expect } from "@playwright/test";
import { COACH, CLIENT } from "./credentials";

test.use({ storageState: COACH.storageState });

test.describe("Coach — client detail page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coach/clients");
    await page.getByRole("link", { name: new RegExp(CLIENT.name) }).click();
    await expect(page.getByRole("heading", { name: CLIENT.name })).toBeVisible();
  });

  test("shows client name, email and goal", async ({ page }) => {
    await expect(page.getByText(CLIENT.email)).toBeVisible();
    await expect(page.getByText(/fat loss/i)).toBeVisible();
  });

  test("shows assigned programme with workouts", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Assigned Programme", exact: true })).toBeVisible();
    // Programme name appears in badge + section; first() resolves strict-mode
    await expect(page.getByText("Full Body Phase 1").first()).toBeVisible();
    await expect(page.getByText(/Workout A/i).first()).toBeVisible();
    await expect(page.getByText(/Workout B/i).first()).toBeVisible();
  });

  test("shows recent workout logs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recent Workouts", exact: true })).toBeVisible();
    await expect(page.getByText("Workout A — Lower Focus").first()).toBeVisible();
  });

  test("workout logs show per-exercise performed sets", async ({ page }) => {
    await expect(page.getByText("Goblet Squat").first()).toBeVisible();
    await expect(page.getByText(/\d+(\.\d+)?kg × \d+/).first()).toBeVisible();
  });

  test("shows check-in scores", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recent Check-ins", exact: true })).toBeVisible();
    await expect(page.getByText("Energy").first()).toBeVisible();
    await expect(page.getByText("Sleep").first()).toBeVisible();
  });

  test("shows latest measurements", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Measurements", exact: true })).toBeVisible();
    await expect(page.getByText("Weight")).toBeVisible();
  });

  test("shows private coach notes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
    await expect(page.getByText(/left knee/i)).toBeVisible();
  });

  test("can add a coach note", async ({ page }) => {
    const note = `e2e note ${Date.now()}`;
    await page.getByRole("button", { name: "+ Add" }).click();
    await page.getByPlaceholder(/private note/i).fill(note);
    await page.getByRole("button", { name: /save note/i }).click();
    await expect(page.getByText(note)).toBeVisible();
  });

  test("back link returns to dashboard", async ({ page }) => {
    await page.getByRole("link", { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL("/coach");
  });
});
