import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  registerUnauthenticatedHandler,
  setApiReadOnly,
} from '@/core/api/apiClient';

import { httpAuthAdapter } from './httpAuthAdapter';
import type {
  AuthAdapter,
  AuthSession,
  PortalRole,
  SignInCredentials,
} from './types';
import { AuthContext } from './useAuth';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  session: AuthSession | null;
  signIn(credentials: SignInCredentials): Promise<void>;
  signOut(): Promise<void>;
  // Super Admin only; `null` ends the simulation.
  simulate(role: PortalRole | null): Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  adapter?: AuthAdapter;
  onSessionTransition?: () => Promise<void>;
}

export function AuthProvider({
  children,
  adapter = httpAuthAdapter,
  onSessionTransition,
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const operationVersion = useRef(0);

  const expireSession = useCallback(async () => {
    const expirationVersion = ++operationVersion.current;

    try {
      await adapter.signOut();
    } catch {
      // An expired local session must still become anonymous if cleanup fails.
    }

    if (operationVersion.current !== expirationVersion) return;

    await onSessionTransition?.();

    if (operationVersion.current !== expirationVersion) return;

    setSession(null);
    setStatus('anonymous');
  }, [adapter, onSessionTransition]);

  useEffect(() => {
    let active = true;
    const restoreVersion = ++operationVersion.current;

    void adapter
      .restore()
      .then((restoredSession) => {
        if (!active || operationVersion.current !== restoreVersion) return;

        setSession(restoredSession);
        setStatus(restoredSession ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!active || operationVersion.current !== restoreVersion) return;

        setSession(null);
        setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, [adapter]);

  useEffect(
    () => registerUnauthenticatedHandler(expireSession),
    [expireSession]
  );

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      const signInVersion = ++operationVersion.current;
      const nextSession = await adapter.signIn(credentials);

      if (operationVersion.current !== signInVersion) return;

      await onSessionTransition?.();

      if (operationVersion.current !== signInVersion) return;

      setSession(nextSession);
      setStatus('authenticated');
    },
    [adapter, onSessionTransition]
  );

  const signOut = useCallback(async () => {
    await expireSession();
  }, [expireSession]);

  const simulate = useCallback(
    async (role: PortalRole | null) => {
      const nextSession = await adapter.simulate(role);
      // Guard writes as soon as the server switches roles, not after the
      // next render's effect runs.
      setApiReadOnly(nextSession.simulatedFrom != null);
      await onSessionTransition?.();
      setSession(nextSession);
    },
    [adapter, onSessionTransition]
  );

  const simulating = session?.simulatedFrom != null;
  useEffect(() => {
    setApiReadOnly(simulating);
    return () => setApiReadOnly(false);
  }, [simulating]);

  // Session expires after the configured idle time (M10 SCR-00).
  const idleTimeoutMinutes = session?.idleTimeoutMinutes;
  useEffect(() => {
    if (status !== 'authenticated' || !idleTimeoutMinutes) return;

    let timer: number;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => void expireSession(),
        idleTimeoutMinutes * 60_000
      );
    };
    const events = ['pointerdown', 'keydown'] as const;

    arm();
    events.forEach((name) => window.addEventListener(name, arm));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, arm));
    };
  }, [expireSession, idleTimeoutMinutes, status]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, signIn, signOut, simulate }),
    [session, signIn, signOut, simulate, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
