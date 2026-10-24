/**
 * The public report form's answers while they are typed, what is still missing, and the request
 * they become (story S1-E10-02; DSA art. 16(2)).
 *
 * Who calls it: hooks/useNoticeDraft.ts and its tests. Pure functions, no React.
 */
import {
  anonymousReason,
  noticeLimits,
  noticeRequestSchema,
  type NoticeReason,
  type NoticeRequest,
} from '@/schemas/notice';

/** What the form holds. kind is a report reason, the removal order, or nothing chosen yet. */
export interface NoticeDraft {
  kind: NoticeReason | 'removal_order' | null;
  contentUrl: string;
  explanation: string;
  notifierName: string;
  notifierEmail: string;
  goodFaith: boolean;
  authorityName: string;
  orderReference: string;
  /** The honeypot: a person never fills it. */
  website: string;
}

/** An empty form. */
export const emptyNoticeDraft: NoticeDraft = {
  kind: null,
  contentUrl: '',
  explanation: '',
  notifierName: '',
  notifierEmail: '',
  goodFaith: false,
  authorityName: '',
  orderReference: '',
  website: '',
};

/** A field the form can point a problem at. */
export type NoticeField =
  | 'kind'
  | 'contentUrl'
  | 'explanation'
  | 'notifierName'
  | 'notifierEmail'
  | 'goodFaith'
  | 'authorityName';

/** What can be wrong, by the key of its message in notices.json (form.problems). */
export type NoticeProblem =
  | 'kind_missing'
  | 'url_missing'
  | 'explanation_missing'
  | 'explanation_too_long'
  | 'name_missing'
  | 'email_invalid'
  | 'good_faith_missing'
  | 'authority_missing';

/** Each field's problem, if it has one. */
export type NoticeProblems = Partial<Record<NoticeField, NoticeProblem>>;

/**
 * Says whether a reason lets the notifier leave their name and email out (child sexual content).
 *
 * @param kind - the chosen kind
 * @returns true only for child sexual content
 */
export function isContactOptional(kind: NoticeDraft['kind']): boolean {
  return kind === anonymousReason;
}

/**
 * Says whether text is an email address, using the shared schema's rule.
 *
 * @param text - what was typed
 * @returns true for an address
 */
function isEmail(text: string): boolean {
  return noticeRequestSchema.options[1].shape.notifierEmail.safeParse(text.trim()).success;
}

/**
 * The problems both kinds share: the link and the explanation.
 *
 * @param draft - the answers
 * @returns the problems found
 */
function sharedProblems(draft: NoticeDraft): NoticeProblems {
  const problems: NoticeProblems = {};
  if (draft.contentUrl.trim() === '') problems.contentUrl = 'url_missing';
  if (draft.explanation.trim() === '') problems.explanation = 'explanation_missing';
  if (draft.explanation.trim().length > noticeLimits.explanation) {
    problems.explanation = 'explanation_too_long';
  }
  return problems;
}

/**
 * The problems of the notifier's details: name and email are required except for child sexual
 * content, and an email that was typed must be an address.
 *
 * @param draft - the answers
 * @returns the problems found
 */
function contactProblems(draft: NoticeDraft): NoticeProblems {
  const problems: NoticeProblems = {};
  const isOptional = isContactOptional(draft.kind);
  if (!isOptional && draft.notifierName.trim() === '') problems.notifierName = 'name_missing';
  const email = draft.notifierEmail.trim();
  if ((!isOptional || email !== '') && !isEmail(email)) problems.notifierEmail = 'email_invalid';
  return problems;
}

/**
 * Finds everything still wrong with the answers, field by field.
 *
 * @param draft - the answers
 * @returns each field's problem; empty when the form can be sent
 */
export function findNoticeProblems(draft: NoticeDraft): NoticeProblems {
  if (draft.kind === 'removal_order') {
    const problems = sharedProblems(draft);
    if (draft.authorityName.trim() === '') problems.authorityName = 'authority_missing';
    if (!isEmail(draft.notifierEmail)) problems.notifierEmail = 'email_invalid';
    return problems;
  }
  // A notice, or nothing chosen yet: then everything a notice needs is listed at once.
  const problems: NoticeProblems = { ...sharedProblems(draft), ...contactProblems(draft) };
  if (draft.kind === null) problems.kind = 'kind_missing';
  if (!draft.goodFaith) problems.goodFaith = 'good_faith_missing';
  return problems;
}

/**
 * Turns complete answers into the request the server takes.
 *
 * @param draft - answers with no problems and a kind chosen
 * @param language - the page's language, for the acknowledgement
 * @param openedAt - when the form was opened (ms), for the bot check
 * @returns the request
 */
export function toNoticeRequest(
  draft: NoticeDraft & { kind: NonNullable<NoticeDraft['kind']> },
  language: 'ro' | 'en',
  openedAt: number,
): NoticeRequest {
  if (draft.kind === 'removal_order') {
    return {
      kind: 'removal_order',
      contentUrl: draft.contentUrl.trim(),
      explanation: draft.explanation.trim(),
      authorityName: draft.authorityName.trim(),
      orderReference: draft.orderReference.trim() || undefined,
      notifierEmail: draft.notifierEmail.trim(),
      language,
    };
  }
  return {
    kind: 'notice',
    reason: draft.kind,
    contentUrl: draft.contentUrl.trim(),
    explanation: draft.explanation.trim(),
    notifierName: draft.notifierName.trim() || undefined,
    notifierEmail: draft.notifierEmail.trim() || undefined,
    goodFaith: true,
    language,
    website: draft.website === '' ? undefined : draft.website,
    openedAt,
  };
}
