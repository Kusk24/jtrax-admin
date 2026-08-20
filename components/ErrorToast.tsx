"use client";

/* One place for "that didn't work".
 *
 * Every failing action in the console used to call
 * `window.alert(e instanceof Error ? e.message : "save failed")`. That put a
 * raw server or network string — always English, sometimes internal — in front
 * of a receptionist using the console in Thai, in a blocking modal that has to
 * be dismissed before anything else can happen.
 *
 * `showError` takes an already-translated sentence. The underlying error goes
 * to the console for whoever is debugging, and never to the screen. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "@/lib/icons";
import { COLORS, FONT } from "@/lib/theme";

type ErrorToastValue = {
  /** `message` must already be localized. `cause` is logged, never shown. */
  showError: (message: string, cause?: unknown) => void;
};

const ErrorToastContext = createContext<ErrorToastValue | null>(null);

const VISIBLE_MS = 6000;

export function ErrorToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((next: string, cause?: unknown) => {
    if (cause !== undefined) console.error(cause);
    setMessage(next);
  }, []);

  useEffect(() => {
    if (message === null) return;
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message]);

  const value = useMemo(() => ({ showError }), [showError]);

  return (
    <ErrorToastContext.Provider value={value}>
      {children}
      {message !== null && (
        /* `alert` announces without stealing focus, so a keyboard user is not
           thrown out of the form they were filling in. */
        <div
          role="alert"
          style={{
            position: "fixed",
            insetInline: 16,
            bottom: 16,
            zIndex: 60,
            margin: "0 auto",
            maxWidth: 420,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${COLORS.danger}`,
            background: COLORS.dangerBg,
            color: COLORS.danger,
            font: `600 13.5px/1.45 ${FONT}`,
            boxShadow: "0 10px 30px rgb(20 33 58 / 0.18)",
          }}
        >
          <Icon name="alertTriangle" size={17} style={{ flex: "none", marginTop: 1 }} />
          <span>{message}</span>
        </div>
      )}
    </ErrorToastContext.Provider>
  );
}

export function useErrorToast(): ErrorToastValue {
  const ctx = useContext(ErrorToastContext);
  if (!ctx) throw new Error("useErrorToast must be used inside <ErrorToastProvider>");
  return ctx;
}
