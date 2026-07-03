import type {
  Branch,
  BranchAdmin,
  BranchId,
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
