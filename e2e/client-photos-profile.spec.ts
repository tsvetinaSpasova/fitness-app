import { test, expect } from "@playwright/test";
import { CLIENT, SIGNOUT_CLIENT } from "./credentials";

test.use({ storageState: CLIENT.storageState });

test.describe("Client — photos page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/photos");
  });

  test("shows heading and upload CTA", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Progress Photos" })).toBeVisible();
    await expect(page.getByText(/upload a progress photo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /choose photo/i })).toBeVisible();
  });

  test("shows privacy note", async ({ page }) => {
    await expect(page.getByText(/private and only visible/i)).toBeVisible();
  });
});

test.describe("Client — profile page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client/profile");
  });

  test("shows client name and email", async ({ page }) => {
    await expect(page.getByText(CLIENT.name)).toBeVisible();
    await expect(page.getByText(CLIENT.email)).toBeVisible();
  });

  test("shows current programme", async ({ page }) => {
    await expect(page.getByText("Current Programme")).toBeVisible();
    await expect(page.getByText("Full Body Phase 1")).toBeVisible();
  });

  test("check-in shortcut navigates to check-in page", async ({ page }) => {
    await page.getByText("Weekly Check-in").click();
    await expect(page).toHaveURL("/client/checkin");
  });
});

test.describe("Client — sign out", () => {
  // Fresh login as a dedicated user: signOut() revokes all of the user's
  // sessions, which would kill the shared storage state for later specs.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign out returns to login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(SIGNOUT_CLIENT.email);
    await page.getByLabel("Password").fill(SIGNOUT_CLIENT.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/client");

    await page.goto("/client/profile");
    await page.getByText("Sign out").click();
    await expect(page).toHaveURL("/login");

    // The session is really gone: protected pages redirect back to login
    await page.goto("/client");
    await expect(page).toHaveURL("/login");
  });
});
