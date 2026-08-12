"use client";

/**
 * Loads every backend collection once, exposes the console's display shapes
 * (via lib/live.ts adapters) plus CRUD mutations. Mutations write through the
 * API and then refetch, so derived joins (credits, class names) stay correct.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import {
  toAdmins, toAnnouncements, toParents, toPayments, toStudents, toTournaments,
  type LiveCollections, type Row,
} from "@/lib/live";
import type { AdminPerson, Announcement, ParentPerson, Payment, Student, Tournament } from "@/lib/data";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/derive";

const EMPTY: LiveCollections = {
  students: [], parents: [], parentContacts: [], studentParents: [], classes: [],
  classSessions: [], attendance: [], enrollments: [], creditTransactions: [],
  creditPackages: [], payments: [], teachers: [], admins: [], accounts: [],
  announcements: [], tournaments: [], tournamentCategories: [],
  tournamentRegistrations: [], systemConfig: [],
};

const PATHS: Record<keyof LiveCollections, string> = {
  students: "students", parents: "parents", parentContacts: "parent-contacts",
  studentParents: "student-parents", classes: "classes", classSessions: "class-sessions",
  attendance: "attendance", enrollments: "enrollments",
  creditTransactions: "credit-transactions", creditPackages: "credit-packages",
  payments: "payments", teachers: "teachers", admins: "admins", accounts: "user-accounts",
  announcements: "announcements", tournaments: "tournaments",
  tournamentCategories: "tournament-categories", tournamentRegistrations: "tournament-registrations",
  systemConfig: "system-configuration",
};

type DataContextValue = {
  loading: boolean;
  error: string | null;
  raw: LiveCollections;
  meAccountId: string;
  students: Student[];
  parents: ParentPerson[];
  payments: Payment[];
  admins: AdminPerson[];
  announcements: Announcement[];
  tournaments: Tournament[];
  /* Read from system_configuration, so the thresholds the dashboard follows are
     the academy's, not one browser's. */
  creditRules: CreditRules;
  saveCreditRules: (rules: CreditRules) => Promise<void>;
  refresh: () => Promise<void>;
  create: (path: string, body: Row) => Promise<Row>;
  update: (path: string, id: string, body: Row) => Promise<Row>;
  remove: (path: string, id: string) => Promise<void>;
  /** Writes one system_configuration key, inserting it the first time. */
  setConfig: (key: string, value: string) => Promise<void>;
};

const RULE_KEYS: Record<keyof CreditRules, string> = {
  lowCredit: "credit_rule_low_credit",
  expiringDays: "credit_rule_expiring_days",
  inactiveDays: "credit_rule_inactive_days",
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

  /* config_key is the primary key, so there is no generated id to PATCH
     against until the row exists — hence insert-or-update rather than update. */
  const setConfig = useCallback(async (key: string, value: string) => {
    const exists = raw.systemConfig.some((r) => r["config_key"] === key);
    if (exists) await api.patch(`system-configuration/${key}`, { config_value: value });
    else await api.post("system-configuration", { config_key: key, config_value: value });
    await refresh();
  }, [raw.systemConfig, refresh]);

  const creditRules = useMemo<CreditRules>(() => {
    const read = (key: string, fallback: number) => {
      const row = raw.systemConfig.find((r) => r["config_key"] === key);
      const n = Number(row?.["config_value"]);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      lowCredit: read(RULE_KEYS.lowCredit, DEFAULT_CREDIT_RULES.lowCredit),
      expiringDays: read(RULE_KEYS.expiringDays, DEFAULT_CREDIT_RULES.expiringDays),
      inactiveDays: read(RULE_KEYS.inactiveDays, DEFAULT_CREDIT_RULES.inactiveDays),
    };
  }, [raw.systemConfig]);

  const saveCreditRules = useCallback(async (rules: CreditRules) => {
    /* Sequential, not Promise.all: each write refetches, and three refetches
       racing each other is how one of the three ends up losing its value. */
    for (const [field, key] of Object.entries(RULE_KEYS) as [keyof CreditRules, string][]) {
      await setConfig(key, String(rules[field]));
    }
  }, [setConfig]);

  const value = useMemo<DataContextValue>(() => ({
    loading,
    error,
    raw,
    meAccountId,
    students: toStudents(raw),
    parents: toParents(raw),
    payments: toPayments(raw),
    admins: toAdmins(raw),
    announcements: toAnnouncements(raw),
    tournaments: toTournaments(raw),
    creditRules,
    saveCreditRules,
    refresh,
    create,
    update,
    remove,
    setConfig,
  }), [loading, error, raw, meAccountId, creditRules, saveCreditRules, refresh, create, update, remove, setConfig]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
