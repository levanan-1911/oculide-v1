export type RoomMode = "practice" | "exam";

export type RoomStatus = "scheduled" | "open" | "closed";

export type EnrollmentStatus = "enrolled" | "active" | "completed" | "not_started";

export interface Room {
  roomId: number;
  roomCode: string;
  roomName: string;
  mode: RoomMode;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxAttempts: number;
  passcode: string;
  isActive: boolean;
  status: RoomStatus;
}

export interface RoomFormValues {
  roomCode: string;
  roomName: string;
  mode: RoomMode;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxAttempts: number;
  passcode: string;
}

export interface StudentEnrollment {
  studentId: number;
  studentCode: string;
  fullName: string;
  email: string;
  className: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export type EnrollmentStatusFilter = "all" | EnrollmentStatus;
