/**
 * Certificates by course — JCA Starters, Juniors and NXT. The server works
 * out the hours (from attendance, private and group together, per course) and
 * owns who is certified; the console shows it and asks to certify.
 */
import { api } from "./api";

export const CERTIFICATE_COURSES = ["starters", "juniors", "nxt"] as const;
export type CertificateCourse = (typeof CERTIFICATE_COURSES)[number];

export type CourseCertificate = {
  course: CertificateCourse;
  hours: number;
  status: "in_progress" | "certified";
  certificate_id?: string;
  certified_at?: string;
  hours_at_certification?: number;
};

export type StudentCertificates = { required_hours: number; courses: CourseCertificate[] };

export const getCertificates = (studentId: string) =>
  api.get<StudentCertificates>(`students/${encodeURIComponent(studentId)}/certificates`);

export const certify = (studentId: string, course: CertificateCourse) =>
  api.post<StudentCertificates>(`students/${encodeURIComponent(studentId)}/certificates`, { course });

export function isCertificateCourse(v: unknown): v is CertificateCourse {
  return typeof v === "string" && (CERTIFICATE_COURSES as readonly string[]).includes(v);
}

/** 35.5, not 35.50 or 35.4999. */
export const fmtHours = (h: number) => String(Math.round(h * 10) / 10);
