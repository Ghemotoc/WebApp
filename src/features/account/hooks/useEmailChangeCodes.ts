/**
 * useEmailChangeCodes: the second half of changing one's email address, typing the two 6-digit
 * codes (story S1-E2-05; Robert, 25 Oct 2026, 09:15: "a OTP email to the old and new email
 * addresses to add in the change thingy to confirm they have access to both").
 *
 * Who calls it: EmailCodesForm. What it calls: api/emailAddress.ts → checkEmailChangeCode(),
 * once per address. A code that was right stays confirmed while the other one is fixed, because
 * Supabase accepts each code only once. When both are right the address has changed, so the
 * cached address is read again (useMyEmail's query).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';

import { checkEmailChangeCode, type EmailCodeCheck } from '../api/emailAddress';

import { requireClient } from './useMyNames';

/** The two codes the person typed. */
export interface TypedCodes {
  currentCode: string;
  newCode: string;
}

/** Which of the two codes are right so far. */
export interface CodeResults {
  current: EmailCodeCheck | null;
  new: EmailCodeCheck | null;
}

/** Nothing checked yet. */
const noResults: CodeResults = { current: null, new: null };

/**
 * Holds the two checks.
 *
 * @param currentEmail - the address now (its code proves the person still reads it)
 * @param newEmail - the address asked for (its code proves the person can read it)
 * @returns check(), the results so far, whether both are done, and the busy and failed states
 */
export function useEmailChangeCodes(currentEmail: string | null, newEmail: string | null) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<CodeResults>(noResults);

  const check = useMutation<CodeResults, Error, TypedCodes>({
    mutationFn: async (typed) => {
      const client = await requireClient();
      // Step 1: each address's code, unless it was already right (it can't be used twice).
      const current =
        results.current === 'confirmed' || currentEmail === null
          ? results.current
          : await checkEmailChangeCode(client, currentEmail, typed.currentCode);
      const next =
        results.new === 'confirmed' || newEmail === null
          ? results.new
          : await checkEmailChangeCode(client, newEmail, typed.newCode);
      return { current, new: next };
    },
    onSuccess: async (checked) => {
      setResults(checked);
      // Step 2: both right means the address changed: read it again.
      if (checked.current === 'confirmed' && checked.new === 'confirmed') {
        await queryClient.invalidateQueries({ queryKey: ['my-email', userId] });
      }
    },
  });

  return {
    check: (typed: TypedCodes) => check.mutate(typed),
    results,
    isDone: results.current === 'confirmed' && results.new === 'confirmed',
    isChecking: check.isPending,
    checkFailed: check.isError,
    /** Forgets the results, for "Send new codes" (new codes replace the old ones). */
    reset: () => {
      setResults(noResults);
      check.reset();
    },
  };
}
