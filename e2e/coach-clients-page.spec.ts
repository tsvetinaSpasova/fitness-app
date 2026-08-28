import { test, expect } from "@playwright/test";
import { COACH, CLIENT, SIGNOUT_CLIENT, OTHER_CLIENT } from "./credentials";

test.use({ storageState: COACH.storageState });

test.describe("Coach — clients page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coach/clients");
  });

  test("shows heading and client count", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
    await expect(page.getByText(/\d+ active clients?/)).toBeVisible();
  });

  test("lists clients with email, programme badge and joined date", async ({ page }) => {
    const row = page.getByRole("link", { name: new RegExp(CLIENT.name) });
    await expect(row).toBeVisible();
    await expect(row.getByText(CLIENT.email)).toBeVisible();
    await expect(row.getByText("Full Body Phase 1")).toBeVisible();
    await expect(row.getByText(/joined/i)).toBeVisible();
  });

  test("search filters by name", async ({ page }) => {
    await page.getByPlaceholder(/search clients/i).fill("sarah");
    await expect(page.getByText(CLIENT.name)).toBeVisible();
    await expect(page.getByText("Marcus Lee")).not.toBeVisible();
  });

  test("search filters by email", async ({ page }) => {
    await page.getByPlaceholder(/search clients/i).fill(SIGNOUT_CLIENT.email);
    await expect(page.getByText("Marcus Lee")).toBeVisible();
    await expect(page.getByText(CLIENT.name)).not.toBeVisible();
  });

  test("search filters by goal", async ({ page }) => {
    await page.getByPlaceholder(/search clients/i).fill("post-natal");
    await expect(page.getByText(OTHER_CLIENT.name)).toBeVisible();
    await expect(page.getByText(CLIENT.name)).not.toBeVisible();
  });

  test("empty search result shows a message, clearing restores the list", async ({ page }) => {
    const search = page.getByPlaceholder(/search clients/i);
    await search.fill("zzz-no-such-client");
    await expect(page.getByText(/no clients match your search/i)).toBeVisible();
    await search.fill("");
    await expect(page.getByText(CLIENT.name)).toBeVisible();
    await expect(page.getByText("Marcus Lee")).toBeVisible();
  });
});
