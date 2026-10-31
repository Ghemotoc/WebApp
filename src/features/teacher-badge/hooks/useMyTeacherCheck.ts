/**
 * useMyTeacherCheck: the signed-in person's Teacher badge, and asking for it either way (story
 * S1-E2-11).
 *
 * Who calls it: TeacherBadgeForm (onboarding step 3 and Settings) and TeacherBadgeSection.
 * What it calls: api/teacherBadge.ts → my_teacher_check(), POST /api/teacher-check/link and the
 * proof upload. Signed out, it reads nothing. After either way, the badge is read again, so the
 * screen shows "Teacher badge · pending" or the link sent.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import type { TeacherLinkRequest } from '../../../schemas/teacherCheck';
import {
  fetchMyTeacherCheck,
  myTeacherCheckQueryKey,
  sendSchoolEmailLink,
  sendTeacherProof,
  TeacherBadgeError,
  type MyTeacherCheck,
  type TeacherBadgeFailure,
} from '../api/teacherBadge';

/**
 * The reason a step failed, or null when it didn't.
 *
 * @returns the reason; unavailable for anything that isn't a TeacherBadgeError
 */
function failureOf(hasFailed: boolean, error: unknown): TeacherBadgeFailure | null {
  if (!hasFailed) return null;
  return error instanceof TeacherBadgeError ? error.failure : 'unavailable';
}

/**
 * Follows the person's badge.
 *
 * @returns teacherCheck (null signed out or without a profile, undefined while loading),
 *   loadFailed, sendLink, sendProof, isSending, linkFailure and proofFailure
 */
export function useMyTeacherCheck() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = myTeacherCheckQueryKey(userId);
  const teacherCheck = useQuery<MyTeacherCheck | null>({
    queryKey,
    enabled: userId !== null,
    queryFn: async () => fetchMyTeacherCheck(await requireClient()),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const link = useMutation({
    mutationFn: async (request: TeacherLinkRequest) =>
      sendSchoolEmailLink(await requireClient(), request),
    onSuccess: refresh,
  });
  const proof = useMutation({
    mutationFn: async (file: File) => sendTeacherProof(await requireClient(), file),
    onSuccess: refresh,
  });
  return {
    teacherCheck: userId === null ? null : teacherCheck.data,
    loadFailed: teacherCheck.isError,
    sendLink: (request: TeacherLinkRequest) => link.mutateAsync(request),
    sendProof: (file: File) => proof.mutateAsync(file),
    isSending: link.isPending || proof.isPending,
    linkFailure: failureOf(link.isError, link.error),
    proofFailure: failureOf(proof.isError, proof.error),
  };
}
