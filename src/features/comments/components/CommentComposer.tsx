/**
 * CommentComposer: "Add a comment" under the chapter, and the smaller reply box under a comment
 * (story S1-E6-01; board 3.5).
 *
 * Board values (B05-ReaderEnd, BOOKS B05): the label, a 3-row text box, "Hide as a spoiler" with
 * the "0 / 3,000" counter at the end of its line, the quiet "Post comment" button (the chapter's
 * one main button is Next chapter) and "Be kind. Every report is read by a person." The board
 * draws no card round the box and puts Post at the right; the box keeps no card here either, and
 * Post sits on the left (ButtonRow, design books item 8). The counter is linked to the box with
 * aria-describedby, so a screen reader hears it with the field. A refusal is said in plain words,
 * the limit with the minutes to wait (criterion 4), a pause of new comments with its end in
 * the viewer's own local time (bundles CALM-8 and CALM-8b: the writer paused them after the box
 * was drawn). When the box comes
 * back after the writer's "Resume now", it takes the focus (focusOnMount; CALM-8).
 * The same box, without the card, posts a comment on one paragraph in its thread (S1-E6-06).
 * Lengths (Robert, 2 Nov 2026): 3,000 characters on the whole chapter and its replies, 500 on a
 * paragraph and every reply in its thread, from the public settings (useCommentLimit).
 * Before sending, a comment with a word from the nudge lists shows KindWordsNudge ("Still want to
 * send this?"), which never blocks it (bundle ADMIN-2, part d3; CLAUDE.md rule 19).
 * The Post button stays pressable; pressed with an empty box, it says so under the box and puts
 * the focus there (design books item 9).
 * Who uses it: CommentsSection (a new comment), CommentItem (a reply) and ParagraphThread (a
 * comment on a paragraph).
 * What it calls: useCommentComposer → post_comment(); useCommentLimit; KindWordsNudge; and
 * PersonalDetailsNote, which asks before words that look like contact details go out (MUST-1b);
 * and RulesWalkthrough, before an under-18's first comment (MUST-1c).
 */
import { useEffect, useId, useRef, type RefObject } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { FieldProblem } from '@/components/ui/FieldProblem';
import { PersonalDetailsNote } from '@/features/privacy/components/PersonalDetailsNote';
import { RulesWalkthrough } from '@/features/safety/components/RulesWalkthrough';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { useMissingField } from '@/lib/forms/useMissingField';
import { formatLocalDayAndTime } from '@/lib/local-time';

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
  /**
   * True to put the focus in the text box when it appears: after "Resume now" the box comes back
   * where the button was (CALM-8).
   */
  focusOnMount?: boolean;
}

/**
 * Puts the focus in the text box when asked. After "Resume now" (CALM-8) the box comes back in
 * place of the button that was pressed, so a keyboard or screen reader user lands in the box
 * instead of on nothing (WCAG 2.2, 2.4.3 focus order).
 *
 * @param textBoxRef - the text box
 * @param shouldFocus - true to move the focus there
 */
function useFocusWhenAsked(
  textBoxRef: RefObject<HTMLTextAreaElement | null>,
  shouldFocus: boolean,
) {
  useEffect(() => {
    if (shouldFocus) textBoxRef.current?.focus();
  }, [textBoxRef, shouldFocus]);
}

/**
 * The words for a post refused during a pause of new comments (CALM-8): until when, on the
 * viewer's own clock, or only that they are paused when the refusal didn't say.
 *
 * @param pausedUntil - when new comments open again, from the refusal, or null
 * @param language - the interface language
 * @returns the translation key and its values
 */
function pausedText(
  pausedUntil: string | null,
  language: string,
): [string, Record<string, unknown>] {
  if (pausedUntil === null) return ['failures.paused_unknown', {}];
  return ['failures.paused', { when: formatLocalDayAndTime(new Date(pausedUntil), language) }];
}

/**
 * The words for a failed post.
 *
 * @param failure - the error
 * @param limit - the box's character limit, named by the length refusals
 * @param language - the interface language, for the end of a pause
 * @returns the translation key and its values
 */
function failureText(
  failure: CommentError,
  limit: string,
  language: string,
): [string, Record<string, unknown>] {
  if (failure.failure === 'refused' || failure.failure === 'too_long') {
    return [`failures.${failure.failure}`, { limit }];
  }
  if (failure.failure === 'paused') return pausedText(failure.pausedUntil, language);
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
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 type-body text-ink">
          <input
            type="checkbox"
            checked={composer.isSpoiler}
            onChange={(event) => composer.setIsSpoiler(event.target.checked)}
            className="m-0 size-[18px] accent-link"
          />
          {t('composer.spoiler')}
        </label>
        {/* Board B05-ReaderEnd: the counter sits at the end of the spoiler line. */}
        <span id={counterId} className="ml-auto type-meta text-ink-muted">
          <span aria-hidden="true">{t('composer.counter', { count, limit })}</span>
          <span className="sr-only">{t('composer.counterLabel', { count, limit })}</span>
        </span>
      </div>
      {/* Buttons on the left (ButtonRow rule); Post is quiet, as the chapter's main button is
          Next chapter (one main button a screen, CALM-2; board B05-ReaderEnd). */}
      <ButtonRow>
        <Button type="submit" variant="secondary" disabled={composer.posting.isPosting}>
          {t(isReply ? 'composer.postReply' : 'composer.post')}
        </Button>
        {isReply && (
          <Button variant="text" onClick={onCancel}>
            {t('composer.cancel')}
          </Button>
        )}
      </ButtonRow>
    </>
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
  const { t, i18n } = useCommentsTranslation();
  const failure = props.composer.posting.failure;
  return (
    <>
      {failure !== null && (
        <p role="alert" className="m-0 type-body text-destructive">
          {t(...failureText(failure, props.limit, i18n.language))}
        </p>
      )}
      <p role="status" className="sr-only">
        {props.composer.justPosted ? t('composer.posted') : ''}
      </p>
      {!props.isCompact && <p className="m-0 type-meta text-ink-muted">{t('composer.kind')}</p>}
    </>
  );
}

/**
 * The questions the box may ask before sending, one at a time: the rules walkthrough before an
 * under-18's first comment (MUST-1c), "Still want to send this?" for a
 * word from the nudge lists (ADMIN-2 d3), then "Post anyway?" for words that look like contact
 * details (MUST-1b). Neither ever blocks the comment.
 *
 * @returns the open question, or nothing
 */
function ComposerQuestions({ composer }: { composer: CommentComposerState }) {
  if (composer.rules.isShown) {
    return <RulesWalkthrough walkthrough={composer.rules} onClosed={composer.editAgain} />;
  }
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
  const missingId = useId();
  const textBoxRef = useRef<HTMLTextAreaElement>(null);
  const composer = useCommentComposer({
    textBoxRef,
    address: props.address,
    replyToId: props.replyTo?.commentId,
    paragraph: props.paragraph,
    onDone: props.onDone,
  });
  useFocusWhenAsked(textBoxRef, props.focusOnMount === true);
  const limitNumber = useCommentLimit(
    props.paragraph !== undefined || props.isOnParagraph === true,
  );
  const limit = new Intl.NumberFormat(i18n.language).format(limitNumber);
  const isReply = props.replyTo !== undefined;
  // Design books item 9: Post stays pressable and says what is missing beside the box.
  const missing = useMissingField(composer.text.trim() === '', fieldId);
  // A reply and a paragraph's comment get the smaller box, with no placeholder or kind line.
  const isCompact = isReply || props.paragraph !== undefined;
  return (
    <form
      onSubmit={missing.submitWhenReady((event) => void composer.send(event))}
      className="flex flex-col gap-3"
    >
      <label htmlFor={fieldId} className="type-body font-semibold text-ink">
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
        aria-describedby={missing.isShown ? `${counterId} ${missingId}` : counterId}
        aria-invalid={missing.isShown ? true : undefined}
        className="w-full resize-y rounded-card border border-control-border bg-paper px-4 py-4 type-body leading-normal text-ink"
      />
      <FieldProblem id={missingId} isShown={missing.isShown}>
        {t('composer.missing')}
      </FieldProblem>
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
