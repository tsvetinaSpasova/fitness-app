export type Role = "coach" | "client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface Client extends User {
  role: "client";
  goal?: string;
  joinedAt: string;
  lastActive?: string;
  assignedProgrammeId?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  videoUrl?: string;
  instructions?: string;
  alternatives?: string[];
  /** False for bodyweight exercises — the UI hides all weight fields. */
  requiresWeight: boolean;
}

/** Per-set prescription when sets differ (e.g. pyramid: 12/10/8). */
export interface SetPrescription {
  reps: number;
  weightKg?: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  restSeconds?: number;
  notes?: string;
  /** Optional coach-prescribed weight, the client's default. */
  targetWeightKg?: number;
  /** When set (one entry per set), overrides the uniform sets × reps. */
  setDetails?: SetPrescription[];
}

export interface Workout {
  id: string;
  name: string;
  order: number;
  exercises: WorkoutExercise[];
}

export interface Programme {
  id: string;
  name: string;
  phase?: number;
  /** Set when this is a client's personal copy rather than a template. */
  clientId?: string;
  workouts: Workout[];
  createdAt: string;
}

export interface ClientProgramme extends Programme {
  clientId: string;
  originalProgrammeId: string;
}

export interface SetLog {
  setNumber: number;
  reps: number;
  /** Null for bodyweight sets — reps only. */
  weightKg: number | null;
}

export interface ExerciseLog {
  exerciseId: string;
  /** Name of the exercise as performed — history keeps making sense even if
   *  the programme's prescription later changes. */
  exerciseName: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id: string;
  clientId: string;
  workoutId: string;
  workoutName: string;
  programmeName: string;
  status: "completed" | "in_progress";
  loggedAt: string;
  exercises: ExerciseLog[];
}

export interface Measurement {
  id: string;
  clientId: string;
  date: string;
  weightKg?: number;
  hipsCm?: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  legsCm?: number;
}

export interface CheckIn {
  id: string;
  clientId: string;
  date: string;
  energy: number;
  sleep: number;
  nutrition: number;
  notes?: string;
}

export interface ProgressPhoto {
  id: string;
  clientId: string;
  date: string;
  url: string;
}

export interface CoachNote {
  id: string;
  clientId: string;
  content: string;
  createdAt: string;
}
