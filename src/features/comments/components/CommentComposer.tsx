/**
 * CommentComposer: "Add a comment" under the chapter, and the smaller reply box under a comment
 * (story S1-E6-01; board 3.5).
 *
 * Board values: a white card (24 px corners) with the label, a 3-row text box (16 px corners,
 * #FAF8F5), "Hide as a spoiler", the "0 / 3,000" counter, the solid "Post comment" button and
 * "Be kind. Every report is read by a person." The counter is linked to the box with
 * aria-describedby, so a screen reader hears it with the field. A refusal is said in plain words,
 * the limit with the minutes to wait (criterion 4).
 * The same box, without the card, posts a comment on one paragraph in its thread (S1-E6-06).
 * Lengths (Robert, 2 Nov 2026): 3,000 characters on the whole chapter and its replies, 500 on a
 * paragraph and every reply in its thread, from the public settings (useCommentLimit).
 * Before sending, a comment with a word from the nudge lists shows KindWordsNudge ("Still want to
 * send this?"), which never blocks it (bundle ADMIN-2, part d3; CLAUDE.md rule 19).
 * Who uses it: CommentsSection (a new comment), CommentItem (a reply) and ParagraphThread (a
 * comment on a paragraph).
 * What it calls: useCommentComposer → post_comment(); useCommentLimit; KindWordsNudge; and
 * PersonalDetailsNote, which asks before words that look like contact details go out (MUST-1b).
 */
import { useId, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { PersonalDetailsNote } from '@/features/privacy/components/PersonalDetailsNote';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { cn } from '@/lib/utils';

import type { CommentError } from '../api/comments';
import { useCommentComposer, type CommentComposerState } from '../hooks/useCommentComposer';
import { useCommentLimit } from '../hooks/useCommentLimit';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { KindWordsNudge } from './KindWordsNudge';

/** What the composer needs. */
export interface CommentComposerProps {
  address: ChapterAddress;
  /** For a reply: the comment answered and its author's name. */
  replyTo?: { commentId: string; authorName: string };
  /** Called after a successful post, and on Cancel for a reply. */
  onDone?: () => void;
  /** For a comment on one paragraph (S1-E6-06): its number, from 1. */
  paragraph?: number;
  /** For a reply: true when the comment answered is on a paragraph, so the shorter limit applies. */
  isOnParagraph?: boolean;
}

/**
 * The words for a failed post.
 *
 * @param failure - the error
 * @param limit - the box's character limit, named by the length refusals
 * @returns the translation key and its values
 */
function failureText(failure: CommentError, limit: string): [string, Record<string, unknown>] {
  if (failure.failure === 'refused' || failure.failure === 'too_long') {
    return [`failures.${failure.failure}`, { limit }];
  }
  if (failure.failure !== 'too_many') return [`failures.${failure.failure}`, {}];
  if (failure.waitMinutes === null) return ['failures.too_many_unknown', {}];
  return ['failures.too_many', { count: failure.waitMinutes }];
}

/** What the line under the text box needs. */
interface ComposerControlsProps {
  composer: CommentComposerState;
  counterId: string;
  limit: string;
  isReply: boolean;
  onCancel?: () => void;
}

/**
 * "Hide as a spoiler", the counter, Cancel (replies) and the Post button.
 *
 * @returns the line under the text box
 */
function ComposerControls({
  composer,
  counterId,
  limit,
  isReply,
  onCancel,
}: ComposerControlsProps) {
  const { t } = useCommentsTranslation();
  const count = composer.text.length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={composer.isSpoiler}
          onChange={(event) => composer.setIsSpoiler(event.target.checked)}
          className="m-0 size-[18px] accent-link"
        />
        {t('composer.spoiler')}
      </label>
      <span id={counterId} className="ml-auto text-[13px] text-meta">
        <span aria-hidden="true">{t('composer.counter', { count, limit })}</span>
        <span className="sr-only">{t('composer.counterLabel', { count, limit })}</span>
      </span>
      {isReply && (
        <Button variant="secondary" onClick={onCancel}>
          {t('composer.cancel')}
        </Button>
      )}
      <Button type="submit" disabled={composer.posting.isPosting || composer.text.trim() === ''}>
        {t(isReply ? 'composer.postReply' : 'composer.post')}
      </Button>
    </div>
  );
}

/**
 * Under the form: a refusal in plain words, the "Your comment is up." status for screen readers
 * and, on the full box, "Be kind. Every report is read by a person."
 *
 * @returns the feedback lines
 */
function ComposerFeedback(props: {
  composer: CommentComposerState;
  limit: string;
  isCompact: boolean;
}) {
  const { t } = useCommentsTranslation();
  const failure = props.composer.posting.failure;
  return (
    <>
      {failure !== null && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t(...failureText(failure, props.limit))}
        </p>
      )}
      <p role="status" className="sr-only">
        {props.composer.justPosted ? t('composer.posted') : ''}
      </p>
      {!props.isCompact && <p className="m-0 text-[13px] text-meta">{t('composer.kind')}</p>}
    </>
  );
}

/**
 * The questions the box may ask before sending, one at a time: "Still want to send this?" for a
 * word from the nudge lists (ADMIN-2 d3), then "Post anyway?" for words that look like contact
 * details (MUST-1b). Neither ever blocks the comment.
 *
 * @returns the open question, or nothing
 */
function ComposerQuestions({ composer }: { composer: CommentComposerState }) {
  if (composer.isNudgeShown) {
    return (
      <KindWordsNudge
        onEdit={composer.editAgain}
        onSendAnyway={() => void composer.sendAnyway()}
        isSending={composer.posting.isPosting}
      />
    );
  }
  if (!composer.isDetailsNoteShown) return null;
  return (
    <PersonalDetailsNote
      onChange={composer.editAgain}
      onPostAnyway={() => void composer.postWithDetails()}
      isSending={composer.posting.isPosting}
    />
  );
}

/**
 * The label above the text box.
 *
 * @param props - the composer's props
 * @returns the translation key and its values: a reply, a paragraph or the chapter
 */
function labelText(props: CommentComposerProps): [string, Record<string, unknown>] {
  if (props.replyTo !== undefined)
    return ['composer.replyLabel', { name: props.replyTo.authorName }];
  if (props.paragraph !== undefined) return ['composer.paragraphLabel', {}];
  return ['composer.label', {}];
}

/**
 * Renders the form.
 *
 * @returns the composer
 */
export function CommentComposer(props: CommentComposerProps) {
  const { t, i18n } = useCommentsTranslation();
  const fieldId = useId();
  const counterId = useId();
  const textBoxRef = useRef<HTMLTextAreaElement>(null);
  const composer = useCommentComposer({
    textBoxRef,
    address: props.address,
    replyToId: props.replyTo?.commentId,
    paragraph: props.paragraph,
    onDone: props.onDone,
  });
  const limitNumber = useCommentLimit(
    props.paragraph !== undefined || props.isOnParagraph === true,
  );
  const limit = new Intl.NumberFormat(i18n.language).format(limitNumber);
  const isReply = props.replyTo !== undefined;
  // A reply and a paragraph's comment sit inside a card already, so they get no card of their own.
  const isCompact = isReply || props.paragraph !== undefined;
  return (
    <form
      onSubmit={(event) => void composer.send(event)}
      className={cn(
        'flex flex-col gap-3',
        !isCompact && 'rounded-[24px] border border-border bg-surface px-6 py-5',
      )}
    >
      <label htmlFor={fieldId} className="text-[15px] font-semibold text-ink">
        {t(...labelText(props))}
      </label>
      <textarea
        id={fieldId}
        ref={textBoxRef}
        rows={isCompact ? 2 : 3}
        maxLength={limitNumber}
        value={composer.text}
        onChange={(event) => composer.setText(event.target.value)}
        placeholder={isCompact ? undefined : t('composer.placeholder')}
        aria-describedby={counterId}
        className="w-full resize-y rounded-2xl border border-control-border bg-paper px-[18px] py-3.5 text-base leading-normal text-ink"
      />
      <ComposerQuestions composer={composer} />
      <ComposerControls
        composer={composer}
        counterId={counterId}
        limit={limit}
        isReply={isReply}
        onCancel={props.onDone}
      />
      <ComposerFeedback composer={composer} limit={limit} isCompact={isCompact} />
    </form>
  );
}
