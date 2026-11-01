/**
 * The words for a refused forum write (bundle FORUMS-1, part b; S1-E8-02).
 *
 * Who calls it: PostEditor's callers (NewThreadPage, ReplyForm, PostEditForm) and PostActions.
 * It only picks the translation key; the screen says it in the reader's language.
 */
import type { ForumWriteError } from '../api/forumWrites';

/**
 * The translation key and values for a refusal.
 *
 * @param failure - the error the write threw
 * @returns the key under "failures" and its values ("failures.body.html", "failures.too_many"…)
 */
export function failureText(failure: ForumWriteError): [string, Record<string, unknown>] {
  const field = failure.details.field;
  if (failure.failure === 'invalid' && field !== undefined)
    return [`failures.${field.field}.${field.problem}`, {}];
  if (failure.failure === 'too_many') {
    const minutes = failure.details.waitMinutes ?? null;
    if (minutes === null) return ['failures.too_many_unknown', {}];
    return ['failures.too_many', { count: minutes }];
  }
  return [`failures.${failure.failure}`, {}];
}

/**
 * Whether a refusal is about one field, so the screen can put it under that field.
 *
 * @param failure - the error, or null
 * @param field - 'title' or 'body'
 * @returns true when the refusal names that field
 */
export function isAboutField(failure: ForumWriteError | null, field: 'title' | 'body'): boolean {
  return failure?.details.field?.field === field;
}

/** A refusal's words, sorted by where they go on the form. */
export interface FailureMessages {
  /** Under the title field (TextInput's errorMessage), or undefined. */
  title: string | undefined;
  /** Under the post editor, or null. */
  body: string | null;
  /** Above the buttons, for a refusal not about one field, or null. */
  general: string | null;
}

/**
 * Sorts a refusal's words by where they go.
 *
 * @param failure - the error, or null
 * @param translate - the forums namespace's t()
 * @returns the words for the title, the body and the rest
 */
export function failureMessages(
  failure: ForumWriteError | null,
  translate: (key: string, values: Record<string, unknown>) => string,
): FailureMessages {
  if (failure === null) return { title: undefined, body: null, general: null };
  const message = translate(...failureText(failure));
  return {
    title: isAboutField(failure, 'title') ? message : undefined,
    body: isAboutField(failure, 'body') ? message : null,
    general: failure.details.field === undefined ? message : null,
  };
}
