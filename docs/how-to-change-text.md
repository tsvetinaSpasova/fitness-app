# How to change the text in the app

All the words you see in FitCoach (headings, buttons, labels, error messages,
the "How to measure" guide) live in one file:

**`src/content/copy.json`**

You do not need to install anything or touch any other file. You edit that
one file on GitHub, in your browser, and the site updates itself.

## Step by step

1. Open the file on GitHub:
   https://github.com/tsvetinaSpasova/fitness-app/blob/main/src/content/copy.json
   (you need to be added as a collaborator on the repository first).
2. Click the pencil icon ("Edit this file") in the top right of the file view.
3. Find the text you want to change. Use your browser's find (Cmd+F / Ctrl+F)
   and search for the words as they appear in the app.
4. Change only the words **between the quotes on the right-hand side** of the
   colon. For example, to rename the button:

   ```
   "saveButton": "Save programme",
   ```

   becomes

   ```
   "saveButton": "Save my programme",
   ```

5. Click the green **Commit changes...** button.
6. In the dialog, choose **Create a new branch for this commit and start a
   pull request**, then click **Propose changes**.
7. On the next page click **Create pull request**. A few minutes later a
   bot comment will appear with a preview link where you can check the new
   text on a copy of the site. Nothing is live yet.
8. When it looks right, ask a developer to merge the pull request (or merge it
   yourself if you have been told you can). Merging publishes the change to
   the live site within a couple of minutes.

## Rules that keep the file working

- Change the words on the **right** of the colon only. The names on the left
  (like `"saveButton"`) are what the code looks up. Renaming or deleting one
  breaks the build and the change will not go live.
- Keep the surrounding quotes and the comma at the end of the line.
- If your text needs a double quote inside it, write it as `\"`. Apostrophes
  are fine as they are.
- Words in curly braces like `{name}` or `{count}` are filled in by the app
  (a client's name, a number of workouts). Keep them, but you can move them
  around within the sentence.
- Lists (text inside `[ ... ]`) can have items added, removed or reordered.
  Each item is in quotes and items are separated by commas, with no comma
  after the last one.
- Don't change values that are clearly not text, such as `"unit": "kg"`,
  `"key": "waist"` or web links, unless a developer says it is fine.

## If something goes wrong

If a change breaks the build, the live site simply keeps showing the previous
version, so nothing is lost. The pull request page will show a red cross next
to the Vercel check. Usually it's a missing quote or comma. Compare your edit
with a nearby line, fix it, and commit again to the same pull request.

## For developers

- `src/lib/copy.ts` exports `copy` (the JSON, fully typed) and `fill()` for
  `{placeholder}` substitution. Components import from there instead of
  hardcoding text.
- Because the JSON is typed, removing or renaming a key fails `tsc` and
  therefore the Vercel build, which is the safety net for non-dev edits.
- When you add UI text, add it to `copy.json` under the relevant screen
  rather than writing it inline. The e2e suite asserts on visible text, so
  changing wording may require updating `e2e/`.
