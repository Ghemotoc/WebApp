/**
 * useSession: who is signed in, if anyone (story S1-E14-01, for the "We've updated our Terms"
 * notice; S1-E2-01 and S1-E2-05 build sign-up and sign-in on it).
 *
 * Who calls it: any component that behaves differently for signed-in people, for example
 * LegalUpdateNotice (src/features/legal/components/).
 * What it calls: Supabase Auth through the one client in src/lib/supabase.ts. Supabase reports the
 * stored session first (INITIAL_SESSION), then every sign-in, sign-out and token refresh.
 * What it returns: the signed-in person's user ID (for data caches only, never shown on screen:
 * architecture 1.6) and whether the first answer has arrived.
 * Without Supabase settings there are no accounts, so it answers "signed out".
 */
import { useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase';

/** What the hook answers. */
export interface SessionState {
  /** The signed-in person's user ID, or null when nobody is signed in. Never show it on screen. */
  userId: string | null;
  /** False until Supabase has said whether a session is stored. */
  isKnown: boolean;
}

/**
 * Follows the signed-in person.
 *
 * @returns the current session state
 * Errors: a failed download of the Supabase library is logged without personal data (CLAUDE.md
 *   rule 12) and the app carries on as signed out.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<SessionState>({ userId: null, isKnown: false });

  useEffect(() => {
    let isMounted = true;
    let stopListening: () => void = () => undefined;

    /** Starts listening; Supabase calls back straight away with the stored session. */
    async function listen() {
      const client = await getSupabaseClient();
      if (!isMounted) return;
      // Step 1: no Supabase settings, no accounts.
      if (client === null) {
        setSession({ userId: null, isKnown: true });
        return;
      }
      // Step 2: keep the user ID in step with every Auth event.
      const { data } = client.auth.onAuthStateChange((_event, authSession) => {
        if (isMounted) setSession({ userId: authSession?.user.id ?? null, isKnown: true });
      });
      stopListening = () => data.subscription.unsubscribe();
    }

    listen().catch((error: unknown) => {
      console.warn(
        error instanceof Error ? error.message : 'Could not start the session listener.',
      );
      if (isMounted) setSession({ userId: null, isKnown: true });
    });
    return () => {
      isMounted = false;
      stopListening();
    };
  }, []);

  return session;
}
