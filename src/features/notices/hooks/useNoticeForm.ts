/**
 * useNoticeForm: the public report form's send and its result (story S1-E10-02).
 *
 * Who calls it: NoticePage. What it calls: api/notice.ts. It also remembers what was sent, so
 * "Report received" can say where the receipt went and whether it was an order.
 */
import { useMutation } from '@tanstack/react-query';

import type { NoticeRequest } from '@/schemas/notice';

import { NoticeError, sendNotice, type NoticeFailure } from '../api/notice';

/**
 * The reason a send failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a NoticeError
 */
function failureOf(hasFailed: boolean, error: unknown): NoticeFailure | null {
  if (!hasFailed) return null;
  return error instanceof NoticeError ? error.failure : 'unreachable';
}

/**
 * Follows the form.
 *
 * @returns send(), its state, what was sent and the answer
 */
export function useNoticeForm() {
  const send = useMutation({ mutationFn: (notice: NoticeRequest) => sendNotice(notice) });
  return {
    send: (notice: NoticeRequest) => send.mutateAsync(notice),
    isSending: send.isPending,
    failure: failureOf(send.isError, send.error),
    sent: send.variables ?? null,
    answer: send.data ?? null,
    reset: () => send.reset(),
  };
}
