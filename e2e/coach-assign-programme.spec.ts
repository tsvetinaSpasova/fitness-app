import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COACH, ASSIGN_CLIENT } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: COACH.storageState });

// FR-4.5/4.6 via the assign flow: picking a template opens the programme
// editor prepopulated from it; saving creates a customised per-client copy
// and assigns it. James is the dedicated guinea pig: he has no workout logs,
// so the copies left behind by re-assignment can be deleted in cleanup.

let coachDb: SupabaseClient;
let jamesId: string;

async function assignedProgrammeId(): Promise<string> {
  const { data } = await coachDb
    .from("profiles")
    .select("assigned_programme_id")
    .eq("id", jamesId)
    .single();
  return data!.assigned_programme_id!;
}

test.beforeAll(async () => {
  coachDb = await signInAs(COACH.email, COACH.password);
  const { data } = await coachDb
    .from("profiles")
    .select("id")
    .eq("email", ASSIGN_CLIENT.email)
    .single();
  jamesId = data!.id;
});

test.afterAll(async () => {
  // Remove the copies James is no longer assigned to (each re-assignment
  // deliberately leaves the previous copy behind for log history).
  const keep = await assignedProgrammeId();
  await coachDb.from("programmes").delete().eq("client_id", jamesId).neq("id", keep);
});

test("changing a programme warns, then assigns a customised copy via the editor", async ({ page, browser }) => {
  test.slow(); // several remote Supabase round-trips plus a fresh client login
  const before = await assignedProgrammeId();

  await page.goto(`/coach/clients/${jamesId}`);
  await expect(page.getByRole("heading", { name: ASSIGN_CLIENT.name })).toBeVisible();

  // James already has a programme, so the button reads "Change" and opening
  // it shows the replacement warning.
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText(/customisations to it will no longer apply/i)).toBeVisible();
  await page.getByRole("link", { name: "Full Body Phase 2", exact: true }).click();

  // The editor opens prepopulated from the template…
  await expect(page).toHaveURL(new RegExp(`/coach/clients/${jamesId}/assign/[0-9a-f-]{36}`));
  await expect(page.getByRole("heading", { name: "Assign Programme" })).toBeVisible();
  await expect(page.getByLabel("Programme name")).toHaveValue("Full Body Phase 2");
  await expect(page.getByLabel("Workout name").first()).toHaveValue("Workout A — Lower Power");

  // …and can be customised before assigning (template reps are 6/8/10, so a
  // distinctive 5 proves the copy diverged). A target weight set here becomes
  // the client's default in the logger.
  await page.getByLabel("Reps", { exact: true }).first().fill("5");
  await page.getByLabel("Weight kg").first().fill("22.5");
  await page.getByRole("button", { name: `Assign to ${ASSIGN_CLIENT.name}` }).click();

  // Saving returns to the client, now pointing at a NEW programme row.
  await expect(page).toHaveURL(`/coach/clients/${jamesId}`);
  await expect
    .poll(async () => assignedProgrammeId(), { timeout: 15000 })
    .not.toBe(before);

  // FR-4.6: the new row is a per-client copy of the template.
  const after = await assignedProgrammeId();
  const { data: copy } = await coachDb
    .from("programmes")
    .select("name, client_id, original_programme_id")
    .eq("id", after)
    .single();
  expect(copy!.client_id).toBe(jamesId);
  expect(copy!.name).toBe("Full Body Phase 2");
  expect(copy!.original_programme_id).toBeTruthy();

  // The customisation landed on the copy…
  const { data: copyWorkouts } = await coachDb
    .from("workouts")
    .select("id")
    .eq("programme_id", after);
  const { data: copyExercises } = await coachDb
    .from("workout_exercises")
    .select("reps")
    .in("workout_id", copyWorkouts!.map((w) => w.id));
  expect(copyExercises!.some((e) => e.reps === 5)).toBe(true);

  // …while the template kept its own reps and stayed a template.
  const { data: template } = await coachDb
    .from("programmes")
    .select("client_id")
    .eq("id", copy!.original_programme_id!)
    .single();
  expect(template!.client_id).toBeNull();
  const { data: templateWorkouts } = await coachDb
    .from("workouts")
    .select("id")
    .eq("programme_id", copy!.original_programme_id!);
  const { data: templateExercises } = await coachDb
    .from("workout_exercises")
    .select("reps")
    .in("workout_id", templateWorkouts!.map((w) => w.id));
  expect(templateExercises!.some((e) => e.reps === 5)).toBe(false);

  // And the client themselves sees the customised programme in their portal.
  // (newContext() inherits the file's coach storageState unless overridden.)
  const clientContext = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const clientPage = await clientContext.newPage();
  await clientPage.goto("/login");
  await clientPage.getByLabel("Email").fill(ASSIGN_CLIENT.email);
  await clientPage.getByLabel("Password").fill(ASSIGN_CLIENT.password);
  await clientPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(clientPage).toHaveURL("/client");
  await expect(clientPage.getByRole("heading", { name: "Full Body Phase 2" })).toBeVisible();
  await expect(clientPage.getByText("Workout A — Lower Power").first()).toBeVisible();

  // The coach-configured target weight is the client's default in the logger
  // (James has no previous session, but target would win regardless).
  await clientPage.getByText("Workout A — Lower Power").first().click();
  await expect(clientPage.getByLabel("Set 1 weight", { exact: true }).first()).toHaveValue("22.5");
  await clientContext.close();
});

test("assign dropdown lists the template library as links", async ({ page }) => {
  await page.goto(`/coach/clients/${jamesId}`);
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByRole("link", { name: "Full Body Phase 1", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Full Body Phase 2", exact: true })).toBeVisible();
});

test("assign flow for a client keeps 404 semantics for non-templates", async ({ page }) => {
  // A client copy's id is not assignable — only real templates are.
  const copyId = await assignedProgrammeId();
  const response = await page.goto(`/coach/clients/${jamesId}/assign/${copyId}`);
  expect(response?.status()).toBe(404);
});
