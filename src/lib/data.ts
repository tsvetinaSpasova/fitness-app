// Server-side data access: maps snake_case Supabase rows to the camelCase
// domain types in ./types. All queries run under the caller's RLS context.
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy";
import type { Database } from "@/lib/supabase/types";
import type {
  CheckIn,
  Client,
  CoachNote,
  Exercise,
  Measurement,
  Programme,
  ProgressPhoto,
  User,
  Workout,
  WorkoutLog,
} from "@/lib/types";

type Tables = Database["public"]["Tables"];
type ProfileRow = Tables["profiles"]["Row"];
type ExerciseRow = Tables["exercises"]["Row"];

// Shapes returned by PostgREST embedded selects. The hand-written Database
// type has no relationship metadata, so nested query results are cast to
// these instead of being inferred.
type WorkoutExerciseNested = Tables["workout_exercises"]["Row"] & {
  exercises: ExerciseRow;
};
type WorkoutNested = Tables["workouts"]["Row"] & {
  workout_exercises: WorkoutExerciseNested[];
};
type ProgrammeNested = Tables["programmes"]["Row"] & {
  workouts: WorkoutNested[];
};
type ExerciseLogNested = Tables["exercise_logs"]["Row"] & {
  set_logs: Tables["set_logs"]["Row"][];
  exercises: Pick<ExerciseRow, "name"> | null;
};
type WorkoutLogNested = Tables["workout_logs"]["Row"] & {
  exercise_logs: ExerciseLogNested[];
};

const PROGRAMME_SELECT =
  "*, workouts(*, workout_exercises(*, exercises(*)))";
const WORKOUT_LOG_SELECT = "*, exercise_logs(*, set_logs(*), exercises(name))";

function mapUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

function mapClient(row: ProfileRow): Client {
  return {
    ...mapUser(row),
    role: "client",
    goal: row.goal ?? undefined,
    joinedAt: row.joined_at,
    lastActive: row.last_active ?? undefined,
    assignedProgrammeId: row.assigned_programme_id ?? undefined,
  };
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    videoUrl: row.video_url ?? undefined,
    instructions: row.instructions ?? undefined,
    alternatives: row.alternatives ?? undefined,
    requiresWeight: row.requires_weight,
  };
}

function mapWorkout(row: WorkoutNested): Workout {
  return {
    id: row.id,
    name: row.name,
    order: row.order_num,
    sourceWorkoutId: row.source_workout_id ?? undefined,
    exercises: [...row.workout_exercises]
      .sort((a, b) => a.position - b.position)
      .map((we) => ({
        exerciseId: we.exercise_id,
        exercise: mapExercise(we.exercises),
        sets: we.sets,
        reps: we.reps,
        restSeconds: we.rest_seconds ?? undefined,
        notes: we.notes ?? undefined,
        targetWeightKg: we.target_weight_kg ?? undefined,
        setDetails: we.set_details ?? undefined,
      })),
  };
}

function mapProgramme(row: ProgrammeNested): Programme {
  return {
    id: row.id,
    name: row.name,
    phase: row.phase ?? undefined,
    clientId: row.client_id ?? undefined,
    createdAt: row.created_at,
    workouts: [...row.workouts]
      .sort((a, b) => a.order_num - b.order_num)
      .map(mapWorkout),
  };
}

function mapWorkoutLog(row: WorkoutLogNested): WorkoutLog {
  return {
    id: row.id,
    clientId: row.client_id,
    workoutId: row.workout_id ?? "",
    workoutName: row.workout_name,
    programmeName: row.programme_name,
    status: row.status,
    loggedAt: row.logged_at,
    exercises: row.exercise_logs.map((el) => ({
      exerciseId: el.exercise_id ?? "",
      // The log's own snapshot wins: it survives the exercise being deleted.
      exerciseName: el.exercise_name ?? el.exercises?.name ?? copy.ui.deletedExerciseName,
      sets: [...el.set_logs]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          setNumber: s.set_number,
          reps: s.reps,
          weightKg: s.weight_kg,
        })),
    })),
  };
}

/** The signed-in user's profile, or null when signed out. */
export async function getCurrentProfile(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ? mapUser(data) : null;
}

/** The signed-in client's full profile (goal, programme, …), or null. */
export async function getCurrentClient(): Promise<Client | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data && data.role === "client" ? mapClient(data) : null;
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .order("name");
  return (data ?? []).map(mapClient);
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "client")
    .maybeSingle();
  return data ? mapClient(data) : null;
}

export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("*").order("name");
  return (data ?? []).map(mapExercise);
}

export async function getProgramme(id: string): Promise<Programme | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programmes")
    .select(PROGRAMME_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? mapProgramme(data as unknown as ProgrammeNested) : null;
}

/** Template programmes (the coach's library; copies assigned to clients are excluded). */
export async function getProgrammeTemplates(): Promise<Programme[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programmes")
    .select(PROGRAMME_SELECT)
    .is("client_id", null)
    .order("phase");
  return ((data ?? []) as unknown as ProgrammeNested[]).map(mapProgramme);
}

/** templateId -> number of clients currently on a copy of it. */
export async function getTemplateAssignmentCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const counts = new Map<string, number>();

  // Only copies a client is *currently* assigned to count — re-assigning
  // leaves the old copy behind for log history.
  const { data: assigned } = await supabase
    .from("profiles")
    .select("assigned_programme_id")
    .not("assigned_programme_id", "is", null);
  const assignedIds = (assigned ?? [])
    .map((row) => row.assigned_programme_id)
    .filter((id): id is string => Boolean(id));
  if (assignedIds.length === 0) return counts;

  const { data } = await supabase
    .from("programmes")
    .select("original_programme_id")
    .in("id", assignedIds);
  for (const row of data ?? []) {
    if (row.original_programme_id) {
      counts.set(
        row.original_programme_id,
        (counts.get(row.original_programme_id) ?? 0) + 1
      );
    }
  }
  return counts;
}

/** Common (pre-made) workouts: the coach's library, rows with no programme. */
export async function getWorkoutTemplates(): Promise<Workout[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*, exercises(*))")
    .is("programme_id", null)
    .order("name");
  return ((data ?? []) as unknown as WorkoutNested[]).map(mapWorkout);
}

export async function getWorkoutTemplate(id: string): Promise<Workout | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*, exercises(*))")
    .is("programme_id", null)
    .eq("id", id)
    .maybeSingle();
  return data ? mapWorkout(data as unknown as WorkoutNested) : null;
}

/** exerciseId -> number of workouts (of any kind) prescribing it. */
export async function getExerciseUsageCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("workout_exercises").select("exercise_id");
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
  return counts;
}

export async function getWorkoutWithProgramme(
  workoutId: string
): Promise<{ workout: Workout; programmeName: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*, exercises(*)), programmes(name)")
    .eq("id", workoutId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as WorkoutNested & { programmes: { name: string } };
  return { workout: mapWorkout(row), programmeName: row.programmes.name };
}

export async function getWorkoutLogs(
  clientId?: string,
  limit = 20
): Promise<WorkoutLog[]> {
  const supabase = await createClient();
  let query = supabase
    .from("workout_logs")
    .select(WORKOUT_LOG_SELECT)
    .order("logged_at", { ascending: false })
    .limit(limit);
  if (clientId) query = query.eq("client_id", clientId);
  const { data } = await query;
  return ((data ?? []) as unknown as WorkoutLogNested[]).map(mapWorkoutLog);
}

/** Most recent completed log for one workout, with sets — the "last session" hint. */
export async function getPreviousWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<WorkoutLog | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_logs")
    .select(WORKOUT_LOG_SELECT)
    .eq("client_id", clientId)
    .eq("workout_id", workoutId)
    .eq("status", "completed")
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapWorkoutLog(data as unknown as WorkoutLogNested) : null;
}

export async function getCheckIns(
  clientId?: string,
  limit = 10
): Promise<CheckIn[]> {
  const supabase = await createClient();
  let query = supabase
    .from("check_ins")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);
  if (clientId) query = query.eq("client_id", clientId);
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    energy: row.energy,
    sleep: row.sleep,
    nutrition: row.nutrition,
    notes: row.notes ?? undefined,
  }));
}

export async function getMeasurements(clientId: string): Promise<Measurement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("measurements")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    weightKg: row.weight_kg ?? undefined,
    hipsCm: row.hips_cm ?? undefined,
    waistCm: row.waist_cm ?? undefined,
    chestCm: row.chest_cm ?? undefined,
    armsCm: row.arms_cm ?? undefined,
    legsCm: row.legs_cm ?? undefined,
  }));
}

export async function getCoachNotes(clientId: string): Promise<CoachNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    createdAt: row.created_at,
  }));
}

/** Progress photos with short-lived signed URLs (the bucket is private). */
export async function getProgressPhotos(
  clientId: string
): Promise<ProgressPhoto[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", clientId)
    .order("date", { ascending: false });
  if (!data || data.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from("progress-photos")
    .createSignedUrls(
      data.map((row) => row.url),
      60 * 60
    );

  return data.map((row, i) => ({
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    url: signed?.[i]?.signedUrl ?? "",
  }));
}
