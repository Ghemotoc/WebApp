/**
 * useTeacherEmailConfirm: opens a school email link once and says what happened (story
 * S1-E2-11, criterion 3).
 *
 * Who calls it: TeacherConfirmPage. What it calls: api/teacherBadge.ts → confirm_teacher_email().
 * Works signed out: the link's token is the key. The link is used only once, so the call is made
 * once per token even when React runs the effect twice in development. Afterwards the person's
 * badge is read again, so Settings and the profile show it at once.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { confirmTeacherEmail, type ConfirmOutcome } from '../api/teacherBadge';

/**
 * Confirms the token once.
 *
 * @param token - the token from the link ("" when the link has none)
 * @returns outcome (null while checking, 'gone' for a link without a token) and failed
 */
export function useTeacherEmailConfirm(token: string) {
  const queryClient = useQueryClient();
  const confirming = useMutation({
    mutationFn: async (linkToken: string) => confirmTeacherEmail(await requireClient(), linkToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-teacher-check'] }),
  });
  const confirmedToken = useRef<string | null>(null);
  const { mutate } = confirming;
  useEffect(() => {
    if (token === '' || confirmedToken.current === token) return;
    confirmedToken.current = token;
    mutate(token);
  }, [token, mutate]);
  const outcome: ConfirmOutcome | null = token === '' ? 'gone' : (confirming.data ?? null);
  return { outcome, failed: confirming.isError };
}
