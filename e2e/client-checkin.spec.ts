import { test, expect } from "@playwright/test";
import { CLIENT } from "./credentials";

test.use({ storageState: CLIENT.storageState });

test.describe("Client — weekly check-in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/checkin");
  });

  test("shows check-in heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Weekly Check-in" })).toBeVisible();
    await expect(page.getByText(/rate each area/i)).toBeVisible();
  });

  test("shows all three rating sliders", async ({ page }) => {
    await expect(page.getByText("Energy levels")).toBeVisible();
    await expect(page.getByText("Sleep quality")).toBeVisible();
    await expect(page.locator('input[type="range"]')).toHaveCount(3);
  });

  test("sliders default to 7", async ({ page }) => {
    const sliders = page.locator('input[type="range"]');
    await expect(sliders.nth(0)).toHaveValue("7");
    await expect(sliders.nth(1)).toHaveValue("7");
    await expect(sliders.nth(2)).toHaveValue("7");
  });

  test("moving a slider updates the displayed score", async ({ page }) => {
    const energySlider = page.locator('input[type="range"]').first();
    await energySlider.fill("9");
    await expect(energySlider).toHaveValue("9");
  });

  test("notes textarea accepts input", async ({ page }) => {
    const textarea = page.getByPlaceholder(/feeling great/i);
    await textarea.fill("Had a great week, energy was high!");
    await expect(textarea).toHaveValue("Had a great week, energy was high!");
  });

  test("submitting the check-in saves it and shows confirmation", async ({ page }) => {
    await page.getByRole("button", { name: /submit check-in/i }).click();
    await expect(page.getByText(/check-in submitted/i)).toBeVisible();
    await expect(page.getByText(/your coach will review/i)).toBeVisible();

    // Returning to history shows the saved entry
    await page.getByRole("button", { name: /view history/i }).click();
    await expect(page.getByText("Previous Check-ins")).toBeVisible();
  });

  test("previous check-in history is shown", async ({ page }) => {
    await expect(page.getByText("Previous Check-ins")).toBeVisible();
  });
});
