import { test, expect, type Browser, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH, CROSS_ROLE_CLIENT } from "./credentials";
import { signInAs, userId } from "./db";

// The coach-facing side of client activity (FR-6.8, and the activity-feed
// stand-in for FR-10 notifications): what Emma submits shows up for the
// coach. Emma has no seeded logs or check-ins, so cleanup simply deletes
// everything she created here.

test.use({ storageState: { cookies: [], origins: [] } });

const MARKER = `e2e cross-role ${Date.now()}`;

let emmaDb: SupabaseClient;
let emmaId: string;

test.beforeAll(async () => {
  emmaDb = await signInAs(CROSS_ROLE_CLIENT.email, CROSS_ROLE_CLIENT.password);
  emmaId = await userId(emmaDb);
});

test.afterAll(async () => {
  await emmaDb.from("workout_logs").delete().eq("client_id", emmaId);
  await emmaDb.from("check_ins").delete().eq("client_id", emmaId).like("notes", "e2e cross-role %");
});

async function signInAsEmma(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(CROSS_ROLE_CLIENT.email);
  await page.getByLabel("Password").fill(CROSS_ROLE_CLIENT.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/client");
}

async function openCoachPage(browser: Browser) {
  const context = await browser.newContext({ storageState: COACH.storageState });
  return { context, page: await context.newPage() };
}

test("a client's check-in appears on the coach's client page", async ({ page, browser }) => {
  await signInAsEmma(page);
  await page.goto("/client/checkin");

  // Energy slider up to 9, distinctive note, submit.
  await page.locator('input[type="range"]').first().fill("9");
  await page.getByPlaceholder(/feeling great/i).fill(MARKER);
  await page.getByRole("button", { name: /submit check-in/i }).click();
  await expect(page.getByText(/check-in submitted/i)).toBeVisible();

  // The coach sees it on Emma's detail page.
  const coach = await openCoachPage(browser);
  await coach.page.goto("/coach/clients");
  await coach.page.getByRole("link", { name: new RegExp(CROSS_ROLE_CLIENT.name) }).click();
  await expect(coach.page.getByRole("heading", { name: "Recent Check-ins" })).toBeVisible();
  await expect(coach.page.getByText(MARKER)).toBeVisible();
  await coach.context.close();
});

test("a client's logged workout appears on the coach's dashboard and client page", async ({ page, browser }) => {
  await signInAsEmma(page);

  // Open the first workout of whatever programme Emma is currently on —
  // hardcoding a workout name breaks whenever she gets re-assigned.
  await page.locator('a[href^="/client/workout/"]').first().click();
  await expect(page).toHaveURL(/\/client\/workout\/[0-9a-f-]{36}/);
  const workoutName = (await page.locator("h1").innerText()).trim();
  const workoutNamePattern = new RegExp(workoutName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  // Log one set of the first exercise with a distinctive weight; remember
  // the prefilled reps for the last-session assertion below.
  await page.locator('input[type="number"]').first().fill("123.5");
  const reps = await page.locator('input[type="number"]').nth(1).inputValue();
  await page.locator('[data-testid="set-btn"]').first().click();
  await page.getByRole("button", { name: /complete workout/i }).click();
  await expect(page).toHaveURL("/client");

  const coach = await openCoachPage(browser);

  // Dashboard activity feed shows the fresh log (newest entry).
  await coach.page.goto("/coach");
  await expect(coach.page.getByText(`Logged ${workoutName}`).first()).toBeVisible();

  // Emma's detail page shows the workout with the logged set.
  await coach.page.getByRole("link", { name: new RegExp(CROSS_ROLE_CLIENT.name) }).first().click();
  await expect(coach.page.getByRole("heading", { name: "Recent Workouts" })).toBeVisible();
  await expect(coach.page.getByText(workoutName).first()).toBeVisible();
  await expect(coach.page.getByText(/123\.5kg/).first()).toBeVisible();
  await coach.context.close();

  // FR-5.2: reopening the workout now shows the logged set as the
  // "last session" reference, and pre-fills the weight input from it.
  await page.getByRole("link", { name: workoutNamePattern }).click();
  await expect(page.getByText(new RegExp(`last session: 123\\.5kg × ${reps}`, "i"))).toBeVisible();
  await expect(page.locator('input[type="number"]').first()).toHaveValue("123.5");
});
