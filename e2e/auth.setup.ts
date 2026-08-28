import { test as setup, expect } from "@playwright/test";
import { COACH, CLIENT, NO_PROGRAMME_CLIENT } from "./credentials";

// Signs in once per role and caches the session cookies; the specs reuse
// them via test.use({ storageState }).

setup("authenticate as coach", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(COACH.email);
  await page.getByLabel("Password").fill(COACH.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/coach");
  await page.context().storageState({ path: COACH.storageState });
});

setup("authenticate as client", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(CLIENT.email);
  await page.getByLabel("Password").fill(CLIENT.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/client");
  await page.context().storageState({ path: CLIENT.storageState });
});

setup("authenticate as no-programme client", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(NO_PROGRAMME_CLIENT.email);
  await page.getByLabel("Password").fill(NO_PROGRAMME_CLIENT.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/client");
  await page.context().storageState({ path: NO_PROGRAMME_CLIENT.storageState });
});
