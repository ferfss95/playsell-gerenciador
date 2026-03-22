export interface Profile {
  id: string;
  full_name: string;
  avatar_initials?: string | null;
  enrollment_number?: string | null;
  store_id?: string | null;
  regional_id?: string | null;
  coins?: number;
  created_at: string;
  updated_at: string;
}

export interface DailyPerformance {
  id: string;
  user_id: string;
  date: string;
  sales_target: number;
  sales_current: number;
  average_ticket: number;
  nps: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithPerformance extends Profile {
  latest_performance?: DailyPerformance;
  role?: AppRole;
}

export type TrainingScope = "store" | "regional" | "company";
export type TrainingStatus = "draft" | "active" | "completed" | "archived";
export type TrainingAssignmentStatus = "assigned" | "in_progress" | "completed" | "failed";
export type AppRole = "admin" | "leader" | "user";

export interface Training {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  duration_minutes?: number | null;
  reward_coins: number;
  scope: TrainingScope;
  scope_id?: string | null;
  status: TrainingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingQuiz {
  id: string;
  training_id: string;
  question: string;
  options: string[]; // Array de opções
  correct_answer: number; // Índice da opção correta (0-based)
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingRoleAssignment {
  id: string;
  training_id: string;
  role: AppRole;
  created_at: string;
}

export interface TrainingUserAssignment {
  id: string;
  training_id: string;
  user_id: string;
  status: TrainingAssignmentStatus;
  started_at?: string | null;
  completed_at?: string | null;
  quiz_score?: number | null;
  quiz_answers?: number[] | null; // Array de índices das respostas
  created_at: string;
  updated_at: string;
}

export interface TrainingWithDetails extends Training {
  quizzes: TrainingQuiz[];
  role_assignments: TrainingRoleAssignment[];
  user_assignments_count?: number;
  completed_assignments_count?: number;
}


