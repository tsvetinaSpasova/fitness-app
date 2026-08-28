# Tech Stack Recommendation — Fitness Coaching App

## Summary

The app has two distinct surfaces: a **mobile app** for clients (workout logging, photos, check-ins, health integration) and a **web dashboard** for the coach (client management, programme builder, notifications). Video support, file uploads, real-time notifications, and role-based access are core needs.

The recommended stack minimises infrastructure complexity by using Supabase as a managed backend, letting a small team focus on product rather than DevOps.

---

## Recommended Stack

### Mobile App (Clients) — Expo / React Native

| What | Tool |
|---|---|
| Framework | [Expo](https://expo.dev) (React Native) |
| Language | TypeScript |
| Navigation | Expo Router |
| UI components | NativeWind (Tailwind for React Native) |
| Health integration | `expo-health` / `react-native-health` (Apple HealthKit + Health Connect) |
| Push notifications | Expo Push Notifications |

**Why Expo:** Cross-platform iOS + Android from one codebase. Has first-class libraries for Apple HealthKit and Android Health Connect (FR-9.1). Expo Router gives file-based navigation similar to Next.js. Managed workflow means no Xcode/Android Studio complexity until you need it.

---

### Coach Dashboard (Web) — Next.js

| What | Tool |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Language | TypeScript |
| UI components | shadcn/ui + Tailwind CSS |
| State management | React Query (TanStack Query) |

**Why Next.js:** The coach dashboard is data-heavy and benefits from server-side rendering for fast initial load. Shares TypeScript types with the backend. shadcn/ui gives polished, accessible components quickly.

---

### Backend — Supabase

| What | Tool |
|---|---|
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (email/password, role-based) |
| File storage | Supabase Storage (progress photos, coach-attached files) |
| Real-time | Supabase Realtime (coach notifications on workout/check-in events) |
| API | Auto-generated REST + PostgREST; custom logic via Supabase Edge Functions |

**Why Supabase:** Replaces a custom Node.js API, a separate auth service, and an S3 bucket with a single managed platform. Row-Level Security (RLS) handles the client/coach permission model cleanly — clients can only read their own data, coach reads all. Real-time subscriptions cover the notification centre (FR-10.1, FR-10.2) without a separate WebSocket server.

**Database tables (high level):**

```
users           — id, email, role (coach | client), name
programmes      — id, name, created_by (coach)
workouts        — id, programme_id, name, order
exercises       — id, name, description, video_url, alternatives[]
workout_exercises — workout_id, exercise_id, sets, reps, order
client_programmes — id, client_id, programme_id (copy), name
workout_logs    — id, client_id, workout_id, status, logged_at
set_logs        — id, workout_log_id, exercise_id, set_number, reps, weight_kg
measurements    — id, client_id, date, weight, hips, waist, chest, arms, legs
check_ins       — id, client_id, date, energy, sleep, nutrition
photos          — id, client_id, date, storage_path
coach_notes     — id, client_id, coach_id, content, attachments[]
```

---

### Video Hosting — YouTube (Unlisted)

| What | Tool |
|---|---|
| Video platform | YouTube (unlisted videos, embedded via iframe) |

**Why YouTube:** Free storage and delivery regardless of video length or view count. Handles transcoding, adaptive streaming, and global CDN automatically — zero infrastructure to manage. Works for both short technique clips (FR-3.2) and long-form educational content/courses (FR-8.2).

**How to use it safely:**
- Upload all videos as **unlisted** (not public) — only people with the direct link can watch
- Embed videos in the app using the YouTube iframe embed (`youtube.com/embed/<id>`) — clients never leave the app
- Do not expose the raw YouTube URL in the UI, only the embed — this reduces (but does not eliminate) link leakage risk
- For extra control, restrict the embed domain in YouTube Studio → so the video only plays when embedded on your domain

**Accepted trade-offs:**
- Unlisted ≠ private — if a link leaks, anyone can watch. Acceptable for educational content; higher risk for client-specific material (don't upload personal client videos to YouTube)
- YouTube can remove videos for policy reasons (background music copyright is the most common trigger — use royalty-free or no music)
- YouTube branding and post-playback recommendations will appear in embedded players unless suppressed with `?rel=0&modestbranding=1` parameters

---

### Push Notifications

- **Mobile (clients):** Expo Push Notification Service — wraps APNs (Apple) and FCM (Google) behind one API. Triggered via a Supabase Edge Function when a client logs a workout or check-in.
- **Web (coach):** Supabase Realtime subscription in the Next.js dashboard updates the notification badge without polling.

---

## Infrastructure & Deployment

| What | Tool |
|---|---|
| Mobile distribution | Expo EAS Build → App Store + Google Play |
| Coach web hosting | Vercel (zero-config Next.js deployment) |
| Backend | Supabase Cloud (managed, EU region recommended for GDPR) |
| Video | YouTube (unlisted, embedded) |
| CI/CD | GitHub Actions |

---

## Key Decisions & Trade-offs

### Why not Firebase instead of Supabase?
Firebase is a valid alternative, but its NoSQL Firestore makes relational queries (e.g. "show all set logs for exercise X across all clients") painful. The workout/programme data model is inherently relational — PostgreSQL is the better fit.

### Why not a custom Node.js API?
For a coaching app at this scale, a custom API adds significant maintenance overhead with little benefit. Supabase Edge Functions cover any custom logic (e.g. programme duplication, progressive overload logic). A custom API becomes worthwhile if the business grows and needs fine-grained control.

### Why not Flutter?
Flutter is excellent but the React Native/Expo ecosystem has more mature HealthKit integration libraries and shares TypeScript with the web dashboard, reducing the total number of languages/paradigms the team must maintain.

### Video storage size
Long-form educational videos (FR-8.2) can be hundreds of MB each. Storing them in Supabase Storage would be expensive and slow. YouTube solves this for free — unlimited storage and CDN delivery with zero cost.

---

## Development Phases (suggested)

| Phase | Scope |
|---|---|
| 1 — Core | Auth, client/coach roles, exercise library, programme creation & assignment, workout logging, set/rep/weight log |
| 2 — Progress | Measurements, progress photos, workout history per exercise, coach notes |
| 3 — Engagement | Check-ins, push notifications, video library, educational courses |
| 4 — Advanced | Progressive overload suggestions, in-progress workouts, health app integration |
