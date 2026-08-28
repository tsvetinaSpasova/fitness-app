import { test, expect } from "@playwright/test";
import { COACH, CLIENT } from "./credentials";

test.use({ storageState: COACH.storageState });

test.describe("Coach dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coach");
  });

  test("shows stat cards", async ({ page }) => {
    await expect(page.getByText("Total Clients", { exact: true })).toBeVisible();
    await expect(page.getByText("Workouts Logged", { exact: true })).toBeVisible();
    await expect(page.getByText("Check-ins", { exact: true })).toBeVisible();
    await expect(page.getByText("Active This Week", { exact: true })).toBeVisible();
  });

  test("lists the seeded clients", async ({ page }) => {
    // Client names appear in both the list and the activity feed; first() is sufficient
    await expect(page.getByText("Sarah Johnson").first()).toBeVisible();
    await expect(page.getByText("Marcus Lee").first()).toBeVisible();
    await expect(page.getByText("Emma Clarke").first()).toBeVisible();
    await expect(page.getByText("James Patel").first()).toBeVisible();
    await expect(page.getByText("Olivia Nkosi").first()).toBeVisible();
  });

  test("shows recent activity feed", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Recent Activity" })).toBeVisible();
  });

  test("shows the signed-in coach in the sidebar", async ({ page }) => {
    await expect(page.getByText(COACH.email)).toBeVisible();
  });

  test("sidebar navigation links are present", async ({ page }) => {
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /clients/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /programmes/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /exercises/i })).toBeVisible();
  });

  test("clicking a client navigates to their detail page", async ({ page }) => {
    await page.getByRole("link", { name: new RegExp(CLIENT.name) }).first().click();
    await expect(page).toHaveURL(/\/coach\/clients\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: CLIENT.name })).toBeVisible();
  });

  test("'View all' link goes to clients list", async ({ page }) => {
    await page.getByRole("link", { name: /view all/i }).click();
    await expect(page).toHaveURL("/coach/clients");
  });
});
