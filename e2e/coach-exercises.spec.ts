import { test, expect } from "@playwright/test";
import { COACH } from "./credentials";

test.use({ storageState: COACH.storageState });

test.describe("Coach — exercise library", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coach/exercises");
  });

  test("shows library heading and exercise count", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Exercise Library" })).toBeVisible();
    await expect(page.getByText(/\d+ exercises/)).toBeVisible();
  });

  test("lists key exercises", async ({ page }) => {
    await expect(page.getByText("Goblet Squat", { exact: true })).toBeVisible();
    await expect(page.getByText("Romanian Deadlift", { exact: true })).toBeVisible();
    await expect(page.getByText("Hip Thrust", { exact: true })).toBeVisible();
    await expect(page.getByText("Pull Up", { exact: true })).toBeVisible();
  });

  test("shows muscle group badges", async ({ page }) => {
    await expect(page.getByText("Legs", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Back", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Glutes", { exact: true }).first()).toBeVisible();
  });

  test("shows exercise alternatives", async ({ page }) => {
    await expect(page.getByText("Leg Press").first()).toBeVisible();
    await expect(page.getByText("Bulgarian Split Squat")).toBeVisible();
  });

  test("filtering by muscle group narrows the list", async ({ page }) => {
    await page.getByRole("button", { name: "Legs", exact: true }).click();
    await expect(page.getByText("Goblet Squat", { exact: true })).toBeVisible();
    await expect(page.getByText("Pull Up", { exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByText("Pull Up", { exact: true })).toBeVisible();
  });

  test("add exercise opens and cancels the form", async ({ page }) => {
    await page.getByRole("button", { name: /add exercise/i }).click();
    await expect(page.getByText("New exercise")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("New exercise")).not.toBeVisible();
  });

  test("edit pre-fills the exercise form", async ({ page }) => {
    await page.getByRole("button", { name: "Edit" }).first().click();
    await expect(page.getByText("Edit exercise")).toBeVisible();
    await expect(page.getByPlaceholder("Name *")).not.toHaveValue("");
    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
