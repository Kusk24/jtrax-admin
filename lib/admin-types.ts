export type BranchId = "bangkok" | "onnut" | "bangbo";

export interface Branch {
  id: BranchId;
  name: string;
  managerName: string;
  phone: string;
  email: string;
  students: number;
  teachers: number;
  creditsSold: string;
  revenue: string;
}

export interface BranchAdmin {
  id: string;
  name: string;
  phone: string;
  email: string;
  branchId: BranchId;
}

export type StudentAlert = "expiring" | "lowCredit" | "healthy" | "expired";
export type FollowUpStatus = "notContacted" | "contacted" | "renewed" | "none";

export interface FollowUpRow {
  id: string;
  name: string;
  branchId: BranchId;
  className: string;
  creditsLeft: number;
  creditsTotal: number;
  expireDate: string;
  alert: StudentAlert;
  followUp: FollowUpStatus;
}

export type CourseLevel = "Beginner" | "Intermediate" | "Advance";

export interface Course {
  id: string;
  name: string;
  level: CourseLevel;
  description: string;
  activeSections: number;
  students: number;
  creditsSold: string;
  capacity: number;
  fillPct: number;
}

export interface CourseSection {
  id: string;
  name: string;
  branchId: BranchId;
  schedule: string;
  teacher: string;
  students: number;
  capacity: number;
}

export interface DashboardKpis {
  revenue: string;
  revenueDelta: string;
  branches: number;
  cities: number;
  teachers: number;
  students: number;
  studentsDelta: string;
  attendanceRate: string;
  attendanceDelta: string;
  criticalStudents: number;
}
