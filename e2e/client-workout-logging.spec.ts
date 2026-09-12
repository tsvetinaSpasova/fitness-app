import { test, expect } from "@playwright/test";
import { CLIENT, COACH } from "./credentials";
import { signInAs } from "./db";

test.use({ storageState: CLIENT.storageState });

type Page = import("@playwright/test").Page;

/** Home → workout preview → "Begin workout" → the logger. */
async function beginWorkout(page: Page, name: RegExp) {
  await page.goto("/client");
  await page.getByRole("link", { name }).click();
  await page.getByRole("link", { name: /begin workout/i }).click();
  await expect(page).toHaveURL(/\/client\/workout\/[0-9a-f-]{36}\/start$/);
}

/** Cards start collapsed; open one by name and return its locator. */
async function openExercise(page: Page, name: string) {
  const card = page.getByTestId("exercise-card").filter({ hasText: name });
  await card.getByTestId("exercise-toggle").click();
  await expect(card.getByTestId("set-btn").first()).toBeVisible();
  return card;
}

test.describe("Client — workout logging", () => {
  test.beforeEach(async ({ page }) => {
    await beginWorkout(page, /Workout A — Lower Focus/);
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
  });

  test("shows workout name and exercise count", async ({ page }) => {
    await expect(page.getByText("4 exercises")).toBeVisible();
  });


  test("lists all exercises", async ({ page }) => {
    const cards = page.getByTestId("exercise-card");
    await expect(cards).toHaveCount(4);
    await expect(cards.filter({ hasText: "Goblet Squat" })).toBeVisible();
    await expect(cards.filter({ hasText: "Romanian Deadlift" })).toBeVisible();
    await expect(cards.filter({ hasText: "Hip Thrust" })).toBeVisible();
    await expect(cards.filter({ hasText: "Walking Lunges" })).toBeVisible();
  });

  test("exercises start collapsed and open on tap", async ({ page }) => {
    await expect(page.getByTestId("exercise-card")).toHaveCount(4);
    await expect(page.getByTestId("set-btn")).toHaveCount(0);
    const card = await openExercise(page, "Goblet Squat");
    await expect(card.getByTestId("set-btn")).toHaveCount(3);
    await card.getByTestId("exercise-toggle").click();
    await expect(card.getByTestId("set-btn")).toHaveCount(0);
  });

  test("completed exercises sink below the ones still to do", async ({ page }) => {
    const names = () => page.getByTestId("exercise-card").locator("p.font-semibold").allInnerTexts();
    expect(await names()).toEqual(["Goblet Squat", "Romanian Deadlift", "Hip Thrust", "Walking Lunges"]);

    await page
      .getByTestId("exercise-card")
      .filter({ hasText: "Goblet Squat" })
      .getByTestId("exercise-done-btn")
      .click();
    expect(await names()).toEqual(["Romanian Deadlift", "Hip Thrust", "Walking Lunges", "Goblet Squat"]);
    await expect(page.getByTestId("exercise-progress")).toHaveText("· 1 of 4 done");

    // Clearing it puts it back in programme order.
    await page
      .getByTestId("exercise-card")
      .filter({ hasText: "Goblet Squat" })
      .getByTestId("exercise-done-btn")
      .click();
    expect(await names()).toEqual(["Goblet Squat", "Romanian Deadlift", "Hip Thrust", "Walking Lunges"]);
  });

  test("shows previous performance hint for logged exercise", async ({ page }) => {
    // Sarah has a seeded completed log for this workout
    const card = await openExercise(page, "Goblet Squat");
    await expect(card.getByText(/last session/i)).toBeVisible();
  });

  test("set inputs accept weight and reps", async ({ page }) => {
    const card = await openExercise(page, "Goblet Squat");
    const weightInputs = card.locator('input[type="number"]');
    await weightInputs.first().fill("20");
    await expect(weightInputs.first()).toHaveValue("20");
  });

  test("marking a set as done toggles completion state", async ({ page }) => {
    const card = await openExercise(page, "Goblet Squat");
    const firstSetBtn = card.getByTestId("set-btn").first();
    await firstSetBtn.click();
    await expect(firstSetBtn).toHaveText("✓");
  });

  test("'need an alternative?' expands alternatives list", async ({ page }) => {
    const card = await openExercise(page, "Goblet Squat");
    await card.getByText(/need an alternative/i).click();
    await expect(card.getByText("Leg Press")).toBeVisible();
    await expect(card.getByText("Bulgarian Split Squat")).toBeVisible();
  });

  test("finishing with exercises left asks for confirmation first", async ({ page }) => {
    const completeBtn = page.getByRole("button", { name: /complete workout/i });
    await expect(completeBtn).toBeEnabled();

    // Nothing done: the sheet explains and "Keep going" dismisses it.
    await completeBtn.click();
    const sheet = page.getByTestId("complete-confirm");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/haven't completed all your exercises/i)).toBeVisible();
    await expect(sheet.getByText(/nothing is marked done yet/i)).toBeVisible();
    await sheet.getByRole("button", { name: /keep going/i }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(/\/start$/);

    // Partially done: the count is spelled out, and confirming saves.
    await page
      .getByTestId("exercise-card")
      .filter({ hasText: "Goblet Squat" })
      .getByTestId("exercise-done-btn")
      .click();
    await completeBtn.click();
    await expect(sheet.getByText("1 of 4 exercises are done.")).toBeVisible();
    await sheet.getByRole("button", { name: /yes, finish workout/i }).click();
    await expect(page).toHaveURL("/client");
    // The freshly saved workout shows up in recent logs
    await expect(page.getByRole("heading", { name: "Recent Workouts" })).toBeVisible();
    await expect(page.getByText("Workout A — Lower Focus").first()).toBeVisible();
  });

  test("finishing with every exercise done saves without asking", async ({ page }) => {
    // Done cards sink to the bottom, so the next to-do card is always first.
    for (let i = 1; i <= 4; i++) {
      await page.getByTestId("exercise-done-btn").first().click();
      await expect(page.getByTestId("exercise-progress")).toHaveText(`· ${i} of 4 done`);
    }

    await page.getByRole("button", { name: /complete workout/i }).click();
    await expect(page.getByTestId("complete-confirm")).toHaveCount(0);
    await expect(page).toHaveURL("/client");
  });

  test("back link returns to client workouts", async ({ page }) => {
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL("/client");
  });
});

// Tapping a workout on the home page opens a preview of the whole session
// first; the logger only starts from "Begin workout".
test.describe("Client — workout preview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/client");
    await page.getByRole("link", { name: /Workout A — Lower Focus/ }).click();
    await expect(page).toHaveURL(/\/client\/workout\/[0-9a-f-]{36}$/);
  });

  test("summarises every exercise with sets × reps before starting", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
    await expect(page.getByText(/4 exercises/)).toBeVisible();
    await expect(page.getByText(/warm up first/i)).toBeVisible();
    await expect(page.getByText("Any order works")).toBeVisible();

    const items = page.getByTestId("exercise-overview-item");
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toContainText("Goblet Squat");
    await expect(items.nth(0)).toContainText(/3 × \d+/);
    await expect(items.nth(0)).toContainText(/90s rest/);
    await expect(items.nth(3)).toContainText("Walking Lunges");

    // Nothing is loggable from the preview.
    await expect(page.getByTestId("exercise-card")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /complete workout/i })).toHaveCount(0);
  });

  test("'Begin workout' opens the logger", async ({ page }) => {
    await page.getByRole("link", { name: /begin workout/i }).click();
    await expect(page).toHaveURL(/\/start$/);
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
    await expect(page.getByTestId("exercise-card")).toHaveCount(4);
  });

  test("back link returns to client workouts", async ({ page }) => {
    await page.getByRole("link", { name: /back/i }).click();
    await expect(page).toHaveURL("/client");
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
    await beginWorkout(page, /Workout A — Lower Focus/);
    await expect(page.getByRole("heading", { name: "Workout A — Lower Focus" })).toBeVisible();
  });

  test("shows the prescribed rest time", async ({ page }) => {
    await expect(page.getByText(/90s rest/).first()).toBeVisible();
    await expect(page.getByText(/60s rest/).first()).toBeVisible();
  });

  test("shows the coach's note for an exercise", async ({ page }) => {
    const card = await openExercise(page, "Goblet Squat");
    await expect(card.getByText("Coach note:")).toBeVisible();
    await expect(card.getByText(CUE)).toBeVisible();
  });

  test("'How to do this' reveals instructions and an embedded video", async ({ page }) => {
    const card = await openExercise(page, "Romanian Deadlift");
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
    const card = await openExercise(page, "Hip Thrust");
    await card.getByRole("button", { name: /how to do this/i }).click();
    await expect(card.getByText(/shoulders on bench/i)).toBeVisible();
    await expect(card.locator("iframe")).toHaveCount(0);
  });
});

test.describe("Client — whole-exercise completion and bodyweight exercises", () => {
  test("the header circle completes and clears every set of an exercise", async ({ page }) => {
    await beginWorkout(page, /Workout A — Lower Focus/);
    const card = await openExercise(page, "Goblet Squat");

    await card.getByTestId("exercise-done-btn").click();
    const setBtns = card.getByTestId("set-btn");
    const count = await setBtns.count();
    for (let i = 0; i < count; i++) await expect(setBtns.nth(i)).toHaveText("✓");

    await card.getByTestId("exercise-done-btn").click();
    for (let i = 0; i < count; i++) await expect(setBtns.nth(i)).not.toHaveText("✓");
  });

  test("a bodyweight exercise hides all weight fields", async ({ page }) => {
    // Pull Up is seeded with requires_weight = false; it lives in Workout B.
    await beginWorkout(page, /Workout B — Upper Focus/);

    const pullUp = await openExercise(page, "Pull Up");
    await expect(pullUp.getByLabel(/reps/i)).toHaveCount(3);
    await expect(pullUp.getByLabel(/weight/i)).toHaveCount(0);

    // A weighted exercise in the same workout still has its weight inputs.
    const bench = await openExercise(page, "Dumbbell Bench Press");
    await expect(bench.getByLabel(/weight/i).first()).toBeVisible();
  });

  test("logging a bodyweight exercise records reps-only history", async ({ page }) => {
    await beginWorkout(page, /Workout B — Upper Focus/);

    const pullUp = page.getByTestId("exercise-card").filter({ hasText: "Pull Up" });
    await pullUp.getByTestId("exercise-done-btn").click();
    await page.getByRole("button", { name: /complete workout/i }).click();
    // Only one exercise is done, so finishing asks first.
    await page.getByRole("button", { name: /yes, finish workout/i }).click();
    await expect(page).toHaveURL("/client");

    // The home history shows reps-only chips (no "kg ×") for these sets.
    await expect(page.getByText(/^\d+ reps$/).first()).toBeVisible();
  });
});
