import { test, expect } from "@playwright/test";
import { COACH, CLIENT } from "./credentials";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test("renders logo, email and password fields", async ({ page }) => {
    await page.goto("/login");
    // "DG Coaching" appears in both the h1 and the footer; use role to target the heading
    await expect(page.getByRole("heading", { name: "DG Coaching" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("root path redirects to login when signed out", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("rejects wrong credentials with an error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  });

  test("coach lands on the coach dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(COACH.email);
    await page.getByLabel("Password").fill(COACH.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/coach");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("client lands on the client portal", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(CLIENT.email);
    await page.getByLabel("Password").fill(CLIENT.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL("/client");
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
  });

  test("sign-up mode asks for a name", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /create an account/i }).click();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /already have an account/i }).click();
    await expect(page.getByLabel("Name")).not.toBeVisible();
  });
});
