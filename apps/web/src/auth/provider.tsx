"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession } from "@dnd/types";

type AuthStatus = "authenticated" | "error" | "loading" | "unauthenticated";

type AuthState = {
  error: string | null;
  session: AuthSession | null;
  status: AuthStatus;
};

type AuthContextValue = AuthState & {
  refreshSession: () => Promise<void>;
};

type AuthProviderProps = {
  children: ReactNode;
  initialSession: AuthSession | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    error: null,
    session: initialSession,
    status: "loading",
  });

  const refreshSession = useCallback(async () => {
    setState((current) => ({
      error: null,
      session: current.session,
      status: "loading",
    }));

    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Session endpoint returned an error.");
      }

      const payload = (await response.json()) as { session: AuthSession | null };
      setState({
        error: null,
        session: payload.session,
        status: payload.session ? "authenticated" : "unauthenticated",
      });
    } catch {
      setState((current) => ({
        error: "Unable to verify the current session.",
        session: current.session,
        status: "error",
      }));
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      refreshSession,
    }),
    [refreshSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
