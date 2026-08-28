import { test } from "@playwright/test";

// Living gap list: spec requirements (docs/functional_requirements.md) and
// obvious coach/client flows that the app does not implement yet. Each entry
// is a fixme so it shows up in every run's report without failing the suite;
// when a feature lands, turn its fixme into a real test.

test.describe("Product gaps — coach flows", () => {
  test.fixme("coach can add or invite a client directly", async () => {
    // No flow exists: clients must self-register via the public sign-up form
    // (with email confirmation) before they appear on the roster. The coach
    // cannot create, invite, archive or remove a client from the dashboard.
  });

  test.fixme("coach has a notification centre (FR-1.1, FR-10.1, FR-10.2)", async () => {
    // The dashboard has a passive Recent Activity feed, but no notification
    // centre/badge and no realtime updates when a client logs a workout or
    // submits a check-in.
  });

  test.fixme("coach can attach files to client notes (FR-4.8)", async () => {
    // Notes are text-only; no file attachments.
  });
});

test.describe("Product gaps — client flows", () => {
  test.fixme("client can save a workout as in-progress and resume it (FR-5.5)", async () => {
    // The schema supports status 'in_progress' and the UI renders the badge,
    // but the logger offers only Complete Workout — nothing ever creates an
    // in-progress log.
  });

  test.fixme("client keeps last-session hints across programme phases (FR-5.2/FR-5.4)", async () => {
    // Previous performance is looked up by workout_id. Re-assigning a
    // programme creates a copy with NEW workout ids, so all "last session"
    // hints silently disappear after a phase change even for identical
    // exercises. History should be matched per exercise, not per workout row.
  });

  test.fixme("measurement guide videos (FR-6.2)", async () => {
    // No demonstration video/guide on how to take each measurement.
  });

  test.fixme("per-exercise strength progress over time (FR-6.5)", async () => {
    // The progress page lists recent whole workouts; there is no per-exercise
    // view of weights/reps trending over time.
  });

  test.fixme("progressive overload suggestions (FR-7.1 — low priority)", async () => {});

  test.fixme("educational video library and courses (FR-8)", async () => {
    // No learning section anywhere; exercise video URLs open in a new tab
    // instead of an embedded player.
  });

  test.fixme("health app step import (FR-9.1 — low priority)", async () => {});

  test.fixme("client can reset a forgotten password", async () => {
    // Not in the spec but table stakes: the login page has no
    // "forgot password?" flow.
  });
});
