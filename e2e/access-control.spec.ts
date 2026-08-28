import { test, expect } from "@playwright/test";
import { COACH, CLIENT, OTHER_CLIENT } from "./credentials";
import { signInAs, userId } from "./db";

// The session proxy (src/proxy.ts) owns all of this behaviour: signed-out
// users bounce to /login, signed-in users bounce off public routes, and each
// role is kept out of the other's section. RLS backs it up at the data layer.

test.describe("signed-out access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("coach pages redirect to login", async ({ page }) => {
    for (const path of ["/coach", "/coach/clients", "/coach/programmes", "/coach/exercises"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/login");
    }
  });

  test("client pages redirect to login", async ({ page }) => {
    for (const path of ["/client", "/client/progress", "/client/photos", "/client/checkin", "/client/profile"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/login");
    }
  });
});

test.describe("coach role separation", () => {
  test.use({ storageState: COACH.storageState });

  test("client area redirects back to the coach dashboard", async ({ page }) => {
    await page.goto("/client");
    await expect(page).toHaveURL("/coach");
    await page.goto("/client/progress");
    await expect(page).toHaveURL("/coach");
  });

  test("login and root redirect home when already signed in", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/coach");
    await page.goto("/");
    await expect(page).toHaveURL("/coach");
  });

  test("unknown client id shows a 404", async ({ page }) => {
    const response = await page.goto("/coach/clients/00000000-0000-0000-0000-00000000dead");
    expect(response?.status()).toBe(404);
  });
});

test.describe("client role separation", () => {
  test.use({ storageState: CLIENT.storageState });

  test("coach area redirects back to the client portal", async ({ page }) => {
    await page.goto("/coach");
    await expect(page).toHaveURL("/client");
    await page.goto("/coach/programmes");
    await expect(page).toHaveURL("/client");
    await page.goto("/coach/clients");
    await expect(page).toHaveURL("/client");
  });

  test("login and root redirect home when already signed in", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/client");
    await page.goto("/");
    await expect(page).toHaveURL("/client");
  });

  test("unknown workout id shows a 404", async ({ page }) => {
    const response = await page.goto("/client/workout/00000000-0000-0000-0000-00000000dead");
    expect(response?.status()).toBe(404);
  });

  test("another client's workout is invisible (RLS) and shows a 404", async ({ page }) => {
    // Look up a workout that belongs to Olivia's programme copy, then try to
    // open it as Sarah. RLS hides the row, so the page must 404 rather than
    // leak another client's programme.
    const olivia = await signInAs(OTHER_CLIENT.email, OTHER_CLIENT.password);
    const { data: profile } = await olivia
      .from("profiles")
      .select("assigned_programme_id")
      .eq("id", await userId(olivia))
      .single();
    expect(profile?.assigned_programme_id).toBeTruthy();

    const { data: workouts } = await olivia
      .from("workouts")
      .select("id")
      .eq("programme_id", profile!.assigned_programme_id!)
      .limit(1);
    expect(workouts?.length).toBe(1);

    const response = await page.goto(`/client/workout/${workouts![0].id}`);
    expect(response?.status()).toBe(404);
  });
});
