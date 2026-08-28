import { test, expect } from "@playwright/test";
import { CLIENT } from "./credentials";

test.use({ storageState: CLIENT.storageState });

test.describe("Client — workout logging", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client");
    await page.getByRole("link", { name: /Workout A — Lower Focus/ }).click();
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
  });

  test("shows workout name and exercise count", async ({ page }) => {
    await expect(page.getByText("4 exercises")).toBeVisible();
  });

  test("shows warm-up banner", async ({ page }) => {
    await expect(page.getByText(/warm up first/i)).toBeVisible();
  });

  test("lists all exercises", async ({ page }) => {
    await expect(page.getByText("Goblet Squat")).toBeVisible();
    await expect(page.getByText("Romanian Deadlift")).toBeVisible();
    await expect(page.getByText("Hip Thrust")).toBeVisible();
    await expect(page.getByText("Walking Lunges")).toBeVisible();
  });

  test("shows previous performance hint for logged exercise", async ({ page }) => {
    // Sarah has a seeded completed log for this workout
    await expect(page.getByText(/last session/i).first()).toBeVisible();
  });

  test("set inputs accept weight and reps", async ({ page }) => {
    const weightInputs = page.locator('input[type="number"]');
    await weightInputs.first().fill("20");
    await expect(weightInputs.first()).toHaveValue("20");
  });

  test("marking a set as done toggles completion state", async ({ page }) => {
    const firstSetBtn = page.locator('[data-testid="set-btn"]').first();
    await firstSetBtn.click();
    await expect(firstSetBtn).toHaveText("✓");
  });

  test("'need an alternative?' expands alternatives list", async ({ page }) => {
    await page.getByText(/need an alternative/i).first().click();
    await expect(page.getByText("Leg Press")).toBeVisible();
    await expect(page.getByText("Bulgarian Split Squat")).toBeVisible();
  });

  test("complete workout is disabled until a set is done, then saves", async ({ page }) => {
    const completeBtn = page.getByRole("button", { name: /complete workout/i });
    await expect(completeBtn).toBeDisabled();

    await page.locator('[data-testid="set-btn"]').first().click();
    await expect(completeBtn).toBeEnabled();

    await completeBtn.click();
    await expect(page).toHaveURL("/client");
    // The freshly saved workout shows up in recent logs
    await expect(page.getByRole("heading", { name: "Recent Workouts" })).toBeVisible();
    await expect(page.getByText("Workout A — Lower Focus").first()).toBeVisible();
  });

  test("back link returns to client workouts", async ({ page }) => {
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL("/client");
  });

  test("exercises browse horizontally with arrows and dots", async ({ page }) => {
    await expect(page.getByTestId("exercise-position")).toHaveText("1 / 4");
    await expect(page.getByTestId("exercise-dot")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Previous exercise" })).toBeDisabled();

    await page.getByRole("button", { name: "Next exercise" }).click();
    await expect(page.getByTestId("exercise-position")).toHaveText("2 / 4");
    await expect(page.getByRole("button", { name: "Previous exercise" })).toBeEnabled();

    // Dots jump straight to an exercise; on the last one Next disables.
    await page.getByTestId("exercise-dot").nth(3).click();
    await expect(page.getByTestId("exercise-position")).toHaveText("4 / 4");
    await expect(page.getByRole("button", { name: "Next exercise" })).toBeDisabled();

    await page.getByRole("button", { name: "Previous exercise" }).click();
    await expect(page.getByTestId("exercise-position")).toHaveText("3 / 4");
  });
});

// Exposure of coach-side data inside the logger: rest times, per-exercise
// coach notes, and technique instructions/video (FR-3.2). The video URL and
// the note are installed via the DB for determinism and restored afterwards.
test.describe("Client — exercise details in the logger", () => {
  const CUE = "Chest up, drive through heels (e2e cue)";
  const VIDEO = "https://www.youtube.com/watch?v=cJUvP_4bNP0";
  let coachDb: import("@supabase/supabase-js").SupabaseClient;
  let rdlId: string;
  let originalVideoUrl: string | null;
  let gobletWorkoutId: string;
  let gobletId: string;

  test.beforeAll(async () => {
    const { signInAs } = await import("./db");
    const { COACH } = await import("./credentials");
    coachDb = await signInAs(COACH.email, COACH.password);

    const { data: rdl } = await coachDb
      .from("exercises")
      .select("id, video_url")
      .eq("name", "Romanian Deadlift")
      .single();
    rdlId = rdl!.id;
    originalVideoUrl = rdl!.video_url;
    await coachDb.from("exercises").update({ video_url: VIDEO }).eq("id", rdlId);

    const { data: sarah } = await coachDb
      .from("profiles")
      .select("assigned_programme_id")
      .eq("email", CLIENT.email)
      .single();
    const { data: workout } = await coachDb
      .from("workouts")
      .select("id")
      .eq("programme_id", sarah!.assigned_programme_id!)
      .eq("name", "Workout A — Lower Focus")
      .single();
    gobletWorkoutId = workout!.id;
    const { data: goblet } = await coachDb
      .from("exercises")
      .select("id")
      .eq("name", "Goblet Squat")
      .single();
    gobletId = goblet!.id;
    await coachDb
      .from("workout_exercises")
      .update({ notes: CUE })
      .eq("workout_id", gobletWorkoutId)
      .eq("exercise_id", gobletId);
  });

  test.afterAll(async () => {
    await coachDb.from("exercises").update({ video_url: originalVideoUrl }).eq("id", rdlId);
    await coachDb
      .from("workout_exercises")
      .update({ notes: null })
      .eq("workout_id", gobletWorkoutId)
      .eq("exercise_id", gobletId);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/client");
    await page.getByRole("link", { name: /Workout A — Lower Focus/ }).click();
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
  });

  test("shows the prescribed rest time", async ({ page }) => {
    await expect(page.getByText(/90s rest/).first()).toBeVisible();
    await expect(page.getByText(/60s rest/).first()).toBeVisible();
  });

  test("shows the coach's note for an exercise", async ({ page }) => {
    await expect(page.getByText("Coach note:")).toBeVisible();
    await expect(page.getByText(CUE)).toBeVisible();
  });

  test("'How to do this' reveals instructions and an embedded video", async ({ page }) => {
    const card = page.locator("div.overflow-hidden").filter({ hasText: "Romanian Deadlift" });
    await card.getByRole("button", { name: /how to do this/i }).click();
    await expect(card.getByText(/hinge at hips/i)).toBeVisible();
    const iframe = card.locator("iframe");
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/cJUvP_4bNP0?rel=0&modestbranding=1"
    );
  });

  test("an exercise without a video shows instructions only", async ({ page }) => {
    const card = page.locator("div.overflow-hidden").filter({ hasText: "Hip Thrust" });
    await card.getByRole("button", { name: /how to do this/i }).click();
    await expect(card.getByText(/shoulders on bench/i)).toBeVisible();
    await expect(card.locator("iframe")).toHaveCount(0);
  });
});

test.describe("Client — whole-exercise completion and bodyweight exercises", () => {
  test("the header circle completes and clears every set of an exercise", async ({ page }) => {
    await page.goto("/client");
    await page.getByRole("link", { name: /Workout A — Lower Focus/ }).click();
    const card = page.locator("div.overflow-hidden").filter({ hasText: "Goblet Squat" });

    await card.getByTestId("exercise-done-btn").click();
    const setBtns = card.getByTestId("set-btn");
    const count = await setBtns.count();
    for (let i = 0; i < count; i++) await expect(setBtns.nth(i)).toHaveText("✓");
    await expect(page.getByRole("button", { name: /complete workout/i })).toBeEnabled();

    await card.getByTestId("exercise-done-btn").click();
    for (let i = 0; i < count; i++) await expect(setBtns.nth(i)).not.toHaveText("✓");
  });

  test("a bodyweight exercise hides all weight fields", async ({ page }) => {
    // Pull Up is seeded with requires_weight = false; it lives in Workout B.
    await page.goto("/client");
    await page.getByRole("link", { name: /Workout B — Upper Focus/ }).click();

    const pullUp = page.locator("div.overflow-hidden").filter({ hasText: "Pull Up" });
    await expect(pullUp.getByLabel(/reps/i)).toHaveCount(3);
    await expect(pullUp.getByLabel(/weight/i)).toHaveCount(0);

    // A weighted exercise in the same workout still has its weight inputs.
    const bench = page.locator("div.overflow-hidden").filter({ hasText: "Dumbbell Bench Press" });
    await expect(bench.getByLabel(/weight/i).first()).toBeVisible();
  });

  test("logging a bodyweight exercise records reps-only history", async ({ page }) => {
    await page.goto("/client");
    await page.getByRole("link", { name: /Workout B — Upper Focus/ }).click();

    const pullUp = page.locator("div.overflow-hidden").filter({ hasText: "Pull Up" });
    await pullUp.getByTestId("exercise-done-btn").click();
    await page.getByRole("button", { name: /complete workout/i }).click();
    await expect(page).toHaveURL("/client");

    // The home history shows reps-only chips (no "kg ×") for these sets.
    await expect(page.getByText(/^\d+ reps$/).first()).toBeVisible();
  });
});
