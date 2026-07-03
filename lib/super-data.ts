import type {
  Branch,
  BranchAdmin,
  BranchId,
  CalendarEvent,
  Course,
  CourseSection,
  DashboardKpis,
  FollowUpRow,
} from "./admin-types";

/* Mock data stays English on purpose — it represents backend data, which will
   be localized at the data layer once the backend owns it. */

export const branches: Branch[] = [
  {
    id: "bangkok",
    name: "Bangkok Branch",
    managerName: "Mr. Seong Hyeon",
    phone: "+66 1234 567",
    email: "seohyeon@gmail.com",
    students: 142,
    teachers: 8,
    creditsSold: "1k",
    revenue: "28k",
  },
  {
    id: "bangbo",
    name: "Bangbo Branch",
    managerName: "Mr. Martin",
    phone: "+66 1234 567",
    email: "martin@gmail.com",
    students: 142,
    teachers: 8,
    creditsSold: "2k",
    revenue: "56k",
  },
  {
    id: "onnut",
    name: "Onnut Branch",
    managerName: "Mr. Jay Park",
    phone: "+66 1234 567",
    email: "jaypark@gmail.com",
    students: 142,
    teachers: 8,
    creditsSold: "1.2k",
    revenue: "28k",
  },
];

export const branchAdmins: BranchAdmin[] = [
  {
    id: "a1",
    name: "Mr. Jay Park",
    phone: "+66 1234 567",
    email: "jaypark@gmail.com",
    branchId: "onnut",
  },
  {
    id: "a2",
    name: "Mr. Seong Hyeon",
    phone: "+66 1234 567",
    email: "seohyeon@gmail.com",
    branchId: "bangkok",
  },
  {
    id: "a3",
    name: "Mr. Martin",
    phone: "+66 1234 567",
    email: "martin@gmail.com",
    branchId: "bangbo",
  },
];

export function branchName(id: BranchId) {
  return branches.find((b) => b.id === id)?.name.replace(" Branch", "") ?? id;
}

export const courses: Course[] = [
  {
    id: "beginner",
    name: "Beginner",
    level: "Beginner",
    description:
      "Introduction to basic rules, and tactics, mainly for whom gets started learning chess.",
    activeSections: 6,
    students: 100,
    creditsSold: "1.2k",
    capacity: 20,
    fillPct: 30,
  },
  {
    id: "intermediate",
    name: "Intermediate",
    level: "Intermediate",
    description:
      "Sharpen openings, middlegame plans and endgame technique for club-level play.",
    activeSections: 6,
    students: 100,
    creditsSold: "1.2k",
    capacity: 20,
    fillPct: 65,
  },
  {
    id: "advance",
    name: "Advance",
    level: "Advance",
    description:
      "Tournament preparation with deep strategy, calculation training and analysis.",
    activeSections: 6,
    students: 100,
    creditsSold: "1.2k",
    capacity: 20,
    fillPct: 55,
  },
];

export const courseSections: CourseSection[] = [
  {
    id: "sec101",
    name: "Section 101",
    branchId: "bangkok",
    schedule: "Mon/Wed 9:00 AM",
    teacher: "Serene",
    students: 12,
    capacity: 20,
  },
  {
    id: "sec301",
    name: "Section 301",
    branchId: "onnut",
    schedule: "Sun 9:00 AM",
    teacher: "Serene",
    students: 16,
    capacity: 20,
  },
];

export const calendarEvents: CalendarEvent[] = [
  { title: "Section 101", day: 0, start: 9, end: 10.5, tone: "olive", branch: "Bangkok" },
  { title: "Section 101", day: 2, start: 9, end: 10.5, tone: "olive", branch: "Bangkok" },
  { title: "Section 101", day: 4, start: 9, end: 10.5, tone: "olive", branch: "Bangkok" },
  { title: "Section 102", day: 1, start: 13, end: 14.5, tone: "navy", branch: "Bangkok" },
  { title: "Section 102", day: 3, start: 13, end: 14.5, tone: "navy", branch: "Bangkok" },
  { title: "Section 103", day: 5, start: 10, end: 11.5, tone: "peach", branch: "Onnut" },
  { title: "Section 103", day: 6, start: 9, end: 10.5, tone: "peach", branch: "Onnut" },
  { title: "Section 105", day: 0, start: 15, end: 16.5, tone: "brick", branch: "Bangkok" },
  { title: "Section 105", day: 2, start: 15, end: 16.5, tone: "brick", branch: "Bangkok" },
  { title: "Section 106", day: 5, start: 14, end: 15.5, tone: "navy", branch: "Bangkok" },
  { title: "Section 106", day: 6, start: 16, end: 17.5, tone: "navy", branch: "Bangkok" },
];

export const teacherRows = [
  {
    id: "t1",
    name: "Serene",
    branchIds: ["bangkok", "onnut"] as BranchId[],
    branches: "Bangkok, Onnut",
    classes: "Beginner (Sec101), Beginner (Sec301)",
    weeklyHours: "9h",
    creditsConsumed: 900,
  },
  {
    id: "t2",
    name: "Matalada",
    branchIds: ["bangkok"] as BranchId[],
    branches: "Bangkok",
    classes: "Intermediate (Sec102)",
    weeklyHours: "6h",
    creditsConsumed: 600,
  },
];

export const paymentRows = [
  {
    id: "p1",
    student: "Scarlet",
    studentId: "u6612128",
    branchId: "bangkok" as BranchId,
    className: "Beginner (Sec101)",
    credits: 20,
    amount: "2,000",
    date: "3.5.26",
    method: "onlineBanking" as const,
  },
  {
    id: "p2",
    student: "Penny",
    studentId: "u6612127",
    branchId: "bangkok" as BranchId,
    className: "Beginner (Sec101)",
    credits: 20,
    amount: "2,000",
    date: "1.5.26",
    method: "cash" as const,
  },
];

export const dailyAttendance = [
  { day: "SUN", onnut: 69.0, bangkok: 80.8, bangbo: 74.8 },
  { day: "MON", onnut: 82.8, bangkok: 83.5, bangbo: 61.7 },
  { day: "TUE", onnut: 74.1, bangkok: 87.7, bangbo: 84.7 },
  { day: "WED", onnut: 67.7, bangkok: 51.4, bangbo: 61.4 },
  { day: "THU", onnut: 80.6, bangkok: 78.0, bangbo: 83.2 },
  { day: "FRI", onnut: 59.4, bangkok: 94.0, bangbo: 57.2 },
  { day: "SAT", onnut: 84.7, bangkok: 61.3, bangbo: 58.4 },
];

export const attendanceHistory = [
  {
    id: "h1",
    date: "22.3.26",
    branchId: "bangkok" as BranchId,
    className: "Beginner (Sec101)",
    present: 19,
    absent: 1,
    rate: 95,
  },
  {
    id: "h2",
    date: "22.3.26",
    branchId: "onnut" as BranchId,
    className: "Beginner (Sec101)",
    present: 9,
    absent: 11,
    rate: 45,
  },
];

export const attendanceAlerts = [
  {
    id: "u6612127",
    name: "Penny",
    missed: 5,
    branchId: "bangkok" as BranchId,
    meta: "Beginner | Bangkok",
    guardian: "Kim Ji Won",
  },
  {
    id: "u6612128",
    name: "Uri",
    missed: 4,
    branchId: "bangbo" as BranchId,
    meta: "Beginner | Bangbo",
    guardian: "Kim Ji Won",
  },
];

export const notificationLogs = [
  { name: "Penny", branchId: "bangkok" as BranchId, stamp: "12.5.26 | 8:10 AM" },
];

/* KPI set for a single-branch dashboard (branch admin view). */
export const branchDashboardKpis = {
  revenue: "฿28,000",
  revenueDelta: "+10%",
  teachers: 8,
  students: 142,
  studentsDelta: "+6%",
  attendanceRate: "88%",
  attendanceDelta: "-2%",
  criticalStudents: 12,
};

export const dashboardKpis: DashboardKpis = {
  revenue: "฿55,000",
  revenueDelta: "+10%",
  branches: 3,
  cities: 2,
  teachers: 100,
  students: 330,
  studentsDelta: "+10%",
  attendanceRate: "85%",
  attendanceDelta: "-5%",
  criticalStudents: 34,
};

export const creditTrend = [
  { month: "Jan", credits: 68 },
  { month: "Feb", credits: 44 },
  { month: "Mar", credits: 46 },
  { month: "Apr", credits: 35 },
  { month: "May", credits: 96 },
];

export const topClassFillRates = [
  { name: "Inter (Sec101)", level: "Intermediate", rate: 98 },
  { name: "Beginner (Sec201)", level: "Beginner", rate: 95 },
  { name: "Advance (Sec301)", level: "Advance", rate: 90 },
];

export const branchCreditsSold: { branchId: BranchId; credits: number }[] = [
  { branchId: "bangbo", credits: 2000 },
  { branchId: "onnut", credits: 1000 },
  { branchId: "bangkok", credits: 1500 },
];

export const levelDistribution = [
  { level: "Beginner", students: 100 },
  { level: "Intermediate", students: 90 },
  { level: "Advance", students: 140 },
];

export const weekAttendanceRates = [
  { day: "MON", rate: 41.6 },
  { day: "TUE", rate: 83.0 },
  { day: "WED", rate: 70.7 },
  { day: "THU", rate: 16.9 },
  { day: "FRI", rate: 82.5 },
];

export const followUps: FollowUpRow[] = [
  {
    id: "u6612128",
    name: "Scarlet",
    branchId: "onnut",
    className: "Beginner (Sec101)",
    creditsLeft: 2,
    creditsTotal: 20,
    expireDate: "15.5.26",
    alert: "expiring",
    followUp: "notContacted",
  },
  {
    id: "u6612129",
    name: "Uri",
    branchId: "bangkok",
    className: "Beginner (Sec201)",
    creditsLeft: 3,
    creditsTotal: 20,
    expireDate: "20.6.26",
    alert: "lowCredit",
    followUp: "contacted",
  },
  {
    id: "u6612127",
    name: "Penny",
    branchId: "bangkok",
    className: "Beginner (Sec101)",
    creditsLeft: 0,
    creditsTotal: 20,
    expireDate: "1.5.26",
    alert: "expired",
    followUp: "none",
  },
  {
    id: "u6612130",
    name: "Mike",
    branchId: "bangbo",
    className: "Advance (Sec301)",
    creditsLeft: 12,
    creditsTotal: 20,
    expireDate: "20.8.26",
    alert: "healthy",
    followUp: "renewed",
  },
];
