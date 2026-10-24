/**
 * Sends a notice or a removal order to POST /api/notice (story S1-E10-02).
 *
 * Who calls it: hooks/useNoticeForm.ts. What it calls: the Pages Function functions/api/notice.ts
 * (server/notice.ts), which checks, signs and saves it and sends the acknowledgement.
 */
import { noticeResponseSchema, type NoticeRequest, type NoticeResponse } from '@/schemas/notice';

/** Why a notice wasn't saved, in words the form can explain. */
export type NoticeFailure = 'invalid' | 'unavailable' | 'unreachable';

/** The error a refused notice throws. */
export class NoticeError extends Error {
  constructor(public readonly failure: NoticeFailure) {
    super(`Notice failed: ${failure}`);
  }
}

/**
 * Sends the notice.
 *
 * @param notice - the checked fields
 * @returns the reference, the time of receipt and whether the receipt email left
 * Errors: NoticeError('invalid') for a 400, ('unavailable') for any other refusal,
 *   ('unreachable') when the server can't be reached or answers something unexpected.
 */
export async function sendNotice(notice: NoticeRequest): Promise<NoticeResponse> {
  let response: Response;
  try {
    response = await fetch('/api/notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notice),
    });
  } catch {
    throw new NoticeError('unreachable');
  }
  if (response.status === 400) throw new NoticeError('invalid');
  if (!response.ok) throw new NoticeError('unavailable');
  const parsed = noticeResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new NoticeError('unreachable');
  return parsed.data;
}
