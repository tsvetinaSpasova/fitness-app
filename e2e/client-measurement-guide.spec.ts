import { test, expect } from "@playwright/test";
import { CLIENT } from "./credentials";

test.use({ storageState: CLIENT.storageState });

// FR-6.2: a guide on how to take each measurement correctly. Content lives in
// src/lib/measurement-guide.ts; the page has one section per measure with the
// guide key as its anchor so the log form's "?" links can deep-link to it.

const MEASURES = ["Weight", "Waist", "Hips", "Chest", "Arms", "Legs"];

test.describe("Client — how to measure guide", () => {
  test("guide page covers every measurement with steps and tips", async ({ page }) => {
    await page.goto("/client/progress/how-to-measure");
    await expect(page.getByRole("heading", { name: "How to measure", exact: true })).toBeVisible();
    await expect(page.getByText("Before you start")).toBeVisible();

    for (const label of MEASURES) {
      const section = page.getByRole("region", { name: new RegExp(`^${label}`) });
      await expect(section).toBeVisible();
      await expect(section.getByText("Steps")).toBeVisible();
      await expect(section.getByText("Watch out for")).toBeVisible();
      // At least one numbered step.
      await expect(section.locator("ol li").first()).toBeVisible();
    }
    // Back link returns to the progress page.
    await page.getByRole("link", { name: /back to progress/i }).click();
    await expect(page).toHaveURL(/\/client\/progress$/);
  });

  test("progress page links to the guide", async ({ page }) => {
    await page.goto("/client/progress");
    await page.getByRole("link", { name: "How to measure" }).first().click();
    await expect(page).toHaveURL(/\/client\/progress\/how-to-measure$/);
    await expect(page.getByRole("heading", { name: "How to measure", exact: true })).toBeVisible();
  });

  test("each field in the log form deep-links to its own section", async ({ page }) => {
    await page.goto("/client/progress");
    await page.getByRole("button", { name: /log/i }).click();
    await expect(page.getByText("Log measurements")).toBeVisible();

    for (const label of MEASURES) {
      await expect(
        page.getByRole("link", { name: `How to measure ${label.toLowerCase()}` })
      ).toHaveAttribute("href", `/client/progress/how-to-measure#${label.toLowerCase()}`);
    }

    await page.getByRole("link", { name: "How to measure hips" }).click();
    await expect(page).toHaveURL(/\/client\/progress\/how-to-measure#hips$/);
    await expect(page.getByRole("heading", { name: /^Hips/ })).toBeInViewport();
  });
});
