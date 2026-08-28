import { test, expect } from "@playwright/test";
import { COACH, NO_PROGRAMME_CLIENT } from "./credentials";

// Maya has no programme, logs, check-ins, measurements, photos, or notes —
// these specs pin down every empty state. Read-only: nothing here (or
// anywhere else in the suite) may assign her a programme or create data.

test.describe("Client portal — no programme, no data", () => {
  test.use({ storageState: NO_PROGRAMME_CLIENT.storageState });

  test.beforeEach(async ({ page }) => {
    await page.goto("/client");
  });

  test("home shows the no-programme empty state", async ({ page }) => {
    await expect(page.getByText("No programme assigned yet")).toBeVisible();
    await expect(page.getByText(/your coach will assign/i)).toBeVisible();
    await expect(page.getByText(/0 workouts this week/)).toBeVisible();
  });

  test("progress page shows empty measurements and strength sections", async ({ page }) => {
    await page.goto("/client/progress");
    await expect(page.getByText("No measurements logged yet.")).toBeVisible();
    await expect(page.getByText("No workouts logged yet.")).toBeVisible();
  });

  test("photos page shows the empty timeline", async ({ page }) => {
    await page.goto("/client/photos");
    await expect(page.getByText(/no photos yet/i)).toBeVisible();
  });

  test("check-in page has no history section", async ({ page }) => {
    await page.goto("/client/checkin");
    await expect(page.getByRole("heading", { name: "Weekly Check-in" })).toBeVisible();
    await expect(page.getByText("Previous Check-ins")).not.toBeVisible();
  });

  test("profile shows no programme card", async ({ page }) => {
    await page.goto("/client/profile");
    await expect(page.getByText(NO_PROGRAMME_CLIENT.name)).toBeVisible();
    await expect(page.getByText("Current Programme")).not.toBeVisible();
  });
});

test.describe("Coach view of a client with no programme", () => {
  test.use({ storageState: COACH.storageState });

  test("clients list row has no programme badge", async ({ page }) => {
    await page.goto("/coach/clients");
    const row = page.getByRole("link", { name: new RegExp(NO_PROGRAMME_CLIENT.name) });
    await expect(row).toBeVisible();
    await expect(row.getByText(/full body/i)).not.toBeVisible();
  });

  test("detail page shows empty sections and the Assign button", async ({ page }) => {
    await page.goto("/coach/clients");
    await page.getByRole("link", { name: new RegExp(NO_PROGRAMME_CLIENT.name) }).click();
    await expect(page.getByRole("heading", { name: NO_PROGRAMME_CLIENT.name })).toBeVisible();

    await expect(page.getByText("No programme assigned yet.")).toBeVisible();
    // No programme → the assign button reads "Assign", not "Change",
    // and there is no Edit link.
    await expect(page.getByRole("button", { name: "Assign", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).not.toBeVisible();

    await expect(page.getByText("No workouts logged yet.")).toBeVisible();
    await expect(page.getByText("No check-ins yet.")).toBeVisible();
    await expect(page.getByText("No notes yet.")).toBeVisible();
  });
});
