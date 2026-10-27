export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface ResourceLimits {
  /** Maximum execution time in seconds. */
  timeLimitSeconds: number;
  /** Maximum memory usage in megabytes. */
  memoryLimitMb: number;
}

export interface Question {
  id: string;
  title: string;
  difficulty: QuestionDifficulty;
  tags: string[];
  description: string;
  resourceLimits: ResourceLimits;
  updatedAt: string;
}

export type QuestionInput = Omit<Question, "id" | "updatedAt">;

export type QuestionSetType = "lab" | "exam";

export interface QuestionSet {
  id: string;
  code: string;
  title: string;
  type: QuestionSetType;
  subject: string;
  description: string;
  questionCount: number;
  languages: string[];
  durationMinutes: number;
  classCodes: string[];
  updatedAt: string;
}

