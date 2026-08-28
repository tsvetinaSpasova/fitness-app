import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLIENT, COACH } from "./credentials";
import { signInAs, userId } from "./db";

test.use({ storageState: CLIENT.storageState });

// FR-6.3/6.4: clients upload progress photos, shown chronologically. Uploads
// go to the private progress-photos bucket, so cleanup removes both the
// storage object and the table row (RLS lets Sarah delete only her own).

// 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

let sarahDb: SupabaseClient;

async function deleteTodaysPhotos() {
  const sarahId = await userId(sarahDb);
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows } = await sarahDb
    .from("progress_photos")
    .select("id, url")
    .eq("client_id", sarahId)
    .eq("date", today);
  if (!rows || rows.length === 0) return;
  await sarahDb.storage.from("progress-photos").remove(rows.map((r) => r.url));
  await sarahDb
    .from("progress_photos")
    .delete()
    .in("id", rows.map((r) => r.id));
}

test.beforeAll(async () => {
  sarahDb = await signInAs(CLIENT.email, CLIENT.password);
  await deleteTodaysPhotos();
});

test.afterAll(async () => {
  await deleteTodaysPhotos();
});

test("uploading a photo adds it to the timeline and the coach's view", async ({ page, browser }) => {
  await page.goto("/client/photos");
  const photos = page.locator('img[alt^="Progress photo"]');
  const before = await photos.count();

  await page.locator('input[type="file"]').setInputFiles({
    name: "progress.png",
    mimeType: "image/png",
    buffer: PNG,
  });

  // The upload inserts a row and refreshes the page data; the new photo
  // renders with a signed URL and today's date underneath.
  await expect(photos).toHaveCount(before + 1);
  const today = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  await expect(page.getByText(today).first()).toBeVisible();

  // The photo is also visible to the coach on Sarah's detail page, as the
  // client-facing privacy note promises.
  const coachContext = await browser.newContext({ storageState: COACH.storageState });
  const coachPage = await coachContext.newPage();
  await coachPage.goto(`/coach/clients/${await userId(sarahDb)}`);
  await expect(coachPage.getByRole("heading", { name: "Progress Photos" })).toBeVisible();
  await expect(coachPage.locator('img[alt^="Progress photo"]').first()).toBeVisible();
  await coachContext.close();
});
