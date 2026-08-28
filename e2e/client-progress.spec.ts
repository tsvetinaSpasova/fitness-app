import { test, expect } from "@playwright/test";
import { CLIENT } from "./credentials";

test.use({ storageState: CLIENT.storageState });

test.describe("Client — progress page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/progress");
  });

  test("shows heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();
    await expect(page.getByText(/track your journey/i)).toBeVisible();
  });

  test("shows measurement tiles", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Measurements" })).toBeVisible();
    await expect(page.getByText("Weight", { exact: true })).toBeVisible();
    await expect(page.getByText("Waist", { exact: true })).toBeVisible();
  });

  test("shows measurement history", async ({ page }) => {
    await expect(page.getByText("History")).toBeVisible();
  });

  test("shows strength progress from workout logs", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Strength Progress" })).toBeVisible();
    await expect(page.getByText(/\d+(\.\d+)?kg × \d+/).first()).toBeVisible();
  });

  test("strength history names the performed exercise, not just the sets", async ({ page }) => {
    // Every one of Sarah's Workout A logs (seeded or e2e-created) contains a
    // Goblet Squat instance, so the name must appear next to its sets.
    // (Only the latest 4 logs render, so other exercises may have rotated out.)
    await expect(page.getByText("Goblet Squat").first()).toBeVisible();
  });

  test("log button opens the measurement form", async ({ page }) => {
    await page.getByRole("button", { name: /log/i }).click();
    await expect(page.getByText("Log measurements")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Log measurements")).not.toBeVisible();
  });
});
