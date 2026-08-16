"use client";

/**
 * Loads every backend collection once, exposes the console's display shapes
 * (via lib/live.ts adapters) plus CRUD mutations. Mutations write through the
 * API and then refetch, so derived joins (credits, class names) stay correct.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  monthRevenue, toAdmins, toAnnouncements, toCheckins, toParents, toPayments,
  toRevenueTrend, toStudents, toTodaysClasses, toTournaments,
  type LiveCollections, type Row, type TrendPoint,
} from "@/lib/live";
import type {
  AdminPerson, Announcement, CheckinDef, ClassDef, ParentPerson, Payment, Student, Tournament,
} from "@/lib/data";
import { DEFAULT_CREDIT_RULES, type CreditRules } from "@/lib/derive";

const EMPTY: LiveCollections = {
  students: [], parents: [], parentContacts: [], studentParents: [], classes: [],
  classSessions: [], attendance: [], enrollments: [], creditTransactions: [],
  creditPackages: [], payments: [], teachers: [], admins: [], accounts: [],
  announcements: [], tournaments: [], tournamentCategories: [],
  tournamentRegistrations: [], practiceActivities: [], systemConfig: [],
};

const PATHS: Record<keyof LiveCollections, string> = {
  students: "students", parents: "parents", parentContacts: "parent-contacts",
  studentParents: "student-parents", classes: "classes", classSessions: "class-sessions",
  attendance: "attendance", enrollments: "enrollments",
  creditTransactions: "credit-transactions", creditPackages: "credit-packages",
  payments: "payments", teachers: "teachers", admins: "admins", accounts: "user-accounts",
  announcements: "announcements", tournaments: "tournaments",
  tournamentCategories: "tournament-categories", tournamentRegistrations: "tournament-registrations",
  practiceActivities: "practice-activities",
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
  /* Today's dashboard, from the same rows as everything else. */
  todaysClasses: ClassDef[];
  checkins: CheckinDef[];
  revenueTrend: TrendPoint[];
  monthRevenue: { total: number; count: number };
  /* Read from system_configuration, so the thresholds the dashboard follows are
     the academy's, not one browser's. */
  creditRules: CreditRules;
  saveCreditRules: (rules: CreditRules) => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * Runs several writes as one unit: the refetch every mutation would trigger
   * is held until the last one lands, then done once.
   *
   * Registering a student is nine writes — an account, the student, an
   * enrolment, a parent account, the parent, three contacts, the link — and
   * each of them refetched all twenty-two collections. 189 requests for one
   * registration, which on a free-tier backend reads as the screen hanging.
   */
  batch: <T>(job: () => Promise<T>) => Promise<T>;
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
  /* Depth rather than a flag, so a batch nested inside another (a cascade
     delete called from a flow that is already batching) does not refetch when
     the inner one finishes. */
  const held = useRef(0);
  const missed = useRef(false);

  const refresh = useCallback(async () => {
    if (held.current > 0) {
      missed.current = true;
      return;
    }
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

  const batch = useCallback(async <T,>(job: () => Promise<T>): Promise<T> => {
    held.current += 1;
    try {
      return await job();
    } finally {
      held.current -= 1;
      /* Refetch even when the job threw: a flow that failed halfway has still
         written some of its rows, and the screen has to show them. */
      if (held.current === 0 && missed.current) {
        missed.current = false;
        await refresh();
      }
    }
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
    /* Sequential, not Promise.all: each one decides insert-or-update from the
       collection it read, and three of those racing is how one loses its
       value. Batched, so the three writes cost one refetch rather than three. */
    await batch(async () => {
      for (const [field, key] of Object.entries(RULE_KEYS) as [keyof CreditRules, string][]) {
        await setConfig(key, String(rules[field]));
      }
    });
  }, [batch, setConfig]);

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
    /* `new Date()` inside the memo, not at render: the collections are empty
       until the client fetch lands, so the server and the first client render
       both produce empty lists and cannot disagree about the date. */
    todaysClasses: toTodaysClasses(raw),
    checkins: toCheckins(raw),
    revenueTrend: toRevenueTrend(raw),
    monthRevenue: monthRevenue(raw),
    creditRules,
    saveCreditRules,
    refresh,
    batch,
    create,
    update,
    remove,
    setConfig,
  }), [loading, error, raw, meAccountId, creditRules, saveCreditRules, refresh, batch, create, update, remove, setConfig]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
