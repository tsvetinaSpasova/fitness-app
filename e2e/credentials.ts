// Demo accounts created by supabase/seed.sql.
export const COACH = {
  email: "alex@coach.com",
  password: "password123",
  storageState: "e2e/.auth/coach.json",
};

export const CLIENT = {
  email: "sarah@example.com",
  password: "password123",
  name: "Sarah Johnson",
  storageState: "e2e/.auth/client.json",
};

// Dedicated user for the sign-out test: signOut() revokes ALL of a user's
// sessions server-side, so it must not share an account with the cached
// storage states above.
export const SIGNOUT_CLIENT = {
  email: "marcus@example.com",
  password: "password123",
};

// Dedicated user for cross-role tests (client action → coach sees it).
// Has no seeded logs or check-ins, so tests can clean up after themselves
// by deleting everything they created.
export const CROSS_ROLE_CLIENT = {
  email: "emma@example.com",
  password: "password123",
  name: "Emma Clarke",
};

// Dedicated user for the programme (re)assignment test. Seeded on
// Full Body Phase 2 with no workout logs.
export const ASSIGN_CLIENT = {
  email: "james@example.com",
  password: "password123",
  name: "James Patel",
};

// Used only to look up a foreign workout id for the RLS isolation test.
export const OTHER_CLIENT = {
  email: "olivia@example.com",
  password: "password123",
  name: "Olivia Nkosi",
};

// Deliberately has NO assigned programme (and no activity) so empty states
// can be seen and tested. Keep her unassigned — tests only read.
// liam@example.com is the same but reserved for manual poking around.
export const NO_PROGRAMME_CLIENT = {
  email: "maya@example.com",
  password: "password123",
  name: "Maya Rossi",
  storageState: "e2e/.auth/maya.json",
};
