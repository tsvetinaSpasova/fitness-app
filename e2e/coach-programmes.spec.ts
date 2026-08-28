import { test, expect } from "@playwright/test";
import { COACH } from "./credentials";

test.use({ storageState: COACH.storageState });

test.describe("Coach — programmes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coach/programmes");
  });

  test("shows programme library heading and count", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Programmes" })).toBeVisible();
    await expect(page.getByText(/programmes? in your library/i)).toBeVisible();
  });

  test("lists both seeded programmes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Full Body Phase 1" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Full Body Phase 2" }).first()).toBeVisible();
  });

  test("shows workouts inside each programme", async ({ page }) => {
    await expect(page.getByText("Workout A — Lower Focus").first()).toBeVisible();
    await expect(page.getByText("Workout B — Upper Focus").first()).toBeVisible();
  });

  test("shows phase badges", async ({ page }) => {
    await expect(page.getByText("Phase 1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Phase 2", { exact: true }).first()).toBeVisible();
  });

  test("shows client assignment counts", async ({ page }) => {
    await expect(page.getByText(/\d+ clients?/).first()).toBeVisible();
  });

  test("duplicate buttons are present", async ({ page }) => {
    await expect(page.getByRole("button", { name: /duplicate/i }).first()).toBeVisible();
  });
});
