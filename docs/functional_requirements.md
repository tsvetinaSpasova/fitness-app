# Functional Requirements — Fitness Coaching App

## 1. User Roles

### 1.1 Coach
- The system shall support a Coach role with elevated privileges.
- The Coach shall have a home page displaying a list of all clients.
- Clicking a client shall show their recent logged workouts (exercises, sets, reps, weights).
- The Coach shall have a notification centre showing clients who have recently logged workouts or check-ins.

### 1.2 Client
- The system shall support a Client role with individual login credentials.
- Each client shall have a personal welcome/home page displaying their assigned workouts.
- Clients shall be able to: view workouts, log sets/reps/weights, complete workouts, view their progress, and submit weekly check-ins.
- The client navigation bar shall include: Home (Workouts), Measurements, Photos, Profile.

---

## 2. Authentication

- FR-2.1: Each client shall have unique login credentials (username/email + password).
- FR-2.2: The Coach shall have a separate login with coach-level access.

---

## 3. Exercise Library

- FR-3.1: The system shall maintain a library of exercises (e.g. Goblet Squat, Leg Press).
- FR-3.2: Each exercise shall have a name, description, and a short technique demonstration video.
- FR-3.3: Each exercise shall optionally have a list of alternative exercises displayed to the client on demand (e.g. "Need an alternative?" → Leg Press / Smith Machine / Barbell Squat).
- FR-3.4: Alternatives shall be presented clearly so as not to confuse the client. The client initiates the request; alternatives are not shown by default.

---

## 4. Programme Management (Coach)

- FR-4.1: The Coach shall be able to create workout programmes (e.g. Full Body Phase 1) containing multiple workouts (Workout 1, Workout 2, Workout 3).
- FR-4.2: Each workout shall contain an ordered list of exercises with prescribed sets, reps, and any relevant notes.
- FR-4.3: Every workout shall begin with a warm-up block of general movements.
- FR-4.4: The Coach shall be able to duplicate an existing programme to create a new phase (e.g. Phase 2 from Phase 1).
- FR-4.5: The Coach shall be able to assign a programme from the library to a client.
- FR-4.6: When a programme is assigned to a client, the system shall create a personal copy of that programme for that client (e.g. "John — Full Body Phase 1"). Edits to the client copy shall not affect the original template or other clients.
- FR-4.7: The Coach shall be able to edit a client's assigned programme: replace exercises, reorder exercises, change sets/reps.
- FR-4.8: The Coach shall be able to attach private notes and files to each client's profile (injuries, conditions, preferences, performance observations) visible only to the Coach.

---

## 5. Workout Logging (Client)

- FR-5.1: Clients shall be able to log sets, reps, and weight for each exercise in a workout.
- FR-5.2: During a workout, the client shall see their previous performance for the same exercise (e.g. 40 kg × 10, 40 kg × 10, 42.5 kg × 8) as a reference target.
- FR-5.3: A completed workout shall be saved permanently to the client's history, even when programmes change.
- FR-5.4: The client shall be able to view past performance per exercise across programmes (workout history is preserved through programme transitions).
- FR-5.5 (Low Priority): The system should support saving a workout as "In Progress" if the client does not complete all exercises. The in-progress workout shall remain available for the client to resume in a later session before logging the next workout.

---

## 6. Progress Tracking

### 6.1 Measurements
- FR-6.1: Clients shall be able to log body measurements: weight, hips, waist, chest, arms, legs.
- FR-6.2: The system shall display a demonstration video or guide on how to take each measurement correctly.

### 6.2 Progress Photos
- FR-6.3: Clients shall be able to upload progress photos.
- FR-6.4: Photos shall be stored chronologically and viewable as a timeline.

### 6.3 Strength Progress
- FR-6.5: The system shall display strength progress per exercise over time (weights/reps logged historically).

### 6.4 Check-ins
- FR-6.6: Clients shall be able to submit a weekly check-in consisting of rated questions (scale 1–10).
- FR-6.7: Default check-in questions shall include at minimum: Energy levels, Sleep quality, Nutrition.
- FR-6.8: The Coach shall be able to view all check-in submissions for each client.

---

## 7. Progressive Overload Suggestions (Low Priority)

- FR-7.1: If a client completes all prescribed reps for all sets in a given exercise, the system should display a suggestion on the next session (e.g. "Last time you completed all reps. Try adding 2.5 kg." or "Try 2 extra reps on your first set.").

---

## 8. Video & Educational Content

- FR-8.1: The system shall support a video library of educational content (e.g. how to apply progressive overload, sleep, nutrition, rest, steps).
- FR-8.2: The system shall support long-form video content, structured as courses or modules (e.g. a series of lessons on a topic).
- FR-8.3: Videos shall be accessible to clients from their profile or a dedicated learning section.

---

## 9. Health App Integration (Low Priority)

- FR-9.1: The system should support linking Apple Health and/or Samsung Health to automatically import daily step count, removing the need for manual entry by the client.

---

## 10. Notifications

- FR-10.1: The Coach shall receive notifications when a client logs a workout.
- FR-10.2: The Coach shall receive notifications when a client submits a check-in.

---

## Priority Summary

| Priority | Features |
|---|---|
| High | Exercise library with videos, workout editing per client, client logins, programme library & assignment, programme duplication |
| Medium | Workout history with previous weights, measurements, progress photos, educational video library/courses, permanent workout history across programmes |
| Low | Progressive overload suggestions, in-progress workout saving, exercise alternatives, Apple/Samsung Health integration |
