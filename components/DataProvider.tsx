"use client";

/**
 * Loads every backend collection once, exposes the console's display shapes
 * (via lib/live.ts adapters) plus CRUD mutations. Mutations write through the
 * API and then refetch, so derived joins (credits, class names) stay correct.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import {
  toAdmins, toAnnouncements, toPayments, toStudents, toTournaments,
  type LiveCollections, type Row,
} from "@/lib/live";
import type { AdminPerson, Announcement, Payment, Student, Tournament } from "@/lib/data";

const EMPTY: LiveCollections = {
  students: [], parents: [], parentContacts: [], studentParents: [], classes: [],
  enrollments: [], creditTransactions: [], creditPackages: [], payments: [],
  teachers: [], admins: [], accounts: [], announcements: [], tournaments: [],
  tournamentCategories: [], tournamentRegistrations: [],
};

const PATHS: Record<keyof LiveCollections, string> = {
  students: "students", parents: "parents", parentContacts: "parent-contacts",
  studentParents: "student-parents", classes: "classes", enrollments: "enrollments",
  creditTransactions: "credit-transactions", creditPackages: "credit-packages",
  payments: "payments", teachers: "teachers", admins: "admins", accounts: "user-accounts",
  announcements: "announcements", tournaments: "tournaments",
  tournamentCategories: "tournament-categories", tournamentRegistrations: "tournament-registrations",
};

type DataContextValue = {
  loading: boolean;
  error: string | null;
  raw: LiveCollections;
  meAccountId: string;
  students: Student[];
  payments: Payment[];
  admins: AdminPerson[];
  announcements: Announcement[];
  tournaments: Tournament[];
  refresh: () => Promise<void>;
  create: (path: string, body: Row) => Promise<Row>;
  update: (path: string, id: string, body: Row) => Promise<Row>;
  remove: (path: string, id: string) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<LiveCollections>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meAccountId, setMeAccountId] = useState("");

  const refresh = useCallback(async () => {
    try {
      const keys = Object.keys(PATHS) as (keyof LiveCollections)[];
      const results = await Promise.all(keys.map((k) => api.get<Row[]>(PATHS[k])));
      const next = { ...EMPTY };
      keys.forEach((k, i) => {
        next[k] = results[i];
      });
      setRaw(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    api.get<{ userAccountId: string }>("auth/me").then((m) => setMeAccountId(m.userAccountId)).catch(() => {});
  }, [refresh]);

  const create = useCallback(async (path: string, body: Row) => {
    const row = await api.post<Row>(path, body);
    await refresh();
    return row;
  }, [refresh]);

  const update = useCallback(async (path: string, id: string, body: Row) => {
    const row = await api.patch<Row>(`${path}/${id}`, body);
    await refresh();
    return row;
  }, [refresh]);

  const remove = useCallback(async (path: string, id: string) => {
    await api.del(`${path}/${id}`);
    await refresh();
  }, [refresh]);

  const value = useMemo<DataContextValue>(() => ({
    loading,
    error,
    raw,
    meAccountId,
    students: toStudents(raw),
    payments: toPayments(raw),
    admins: toAdmins(raw),
    announcements: toAnnouncements(raw),
    tournaments: toTournaments(raw),
    refresh,
    create,
    update,
    remove,
  }), [loading, error, raw, meAccountId, refresh, create, update, remove]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
