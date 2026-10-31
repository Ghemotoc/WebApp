/**
 * CommentComposer: "Add a comment" under the chapter, and the smaller reply box under a comment
 * (story S1-E6-01; board 3.5).
 *
 * Board values: a white card (24 px corners) with the label, a 3-row text box (16 px corners,
 * #FAF8F5, at most 2,000 characters), "Hide as a spoiler", the "0 / 2,000" counter, the solid
 * "Post comment" button and "Be kind. Every report is read by a person." The counter is linked to
 * the box with aria-describedby, so a screen reader hears it with the field. A refusal is said in
 * plain words, the limit with the minutes to wait (criterion 4).
 * The same box, without the card, posts a comment on one paragraph in its thread (S1-E6-06).
 * Who uses it: CommentsSection (a new comment), CommentItem (a reply) and ParagraphThread (a
 * comment on a paragraph).
 * What it calls: usePostComment → post_comment().
 */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { cn } from '@/lib/utils';

import type { CommentError } from '../api/comments';
import { usePostComment } from '../hooks/useCommentActions';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** The longest comment (canvas 3.5; the database setting comment_max_characters). */
export const longestComment = 2000;

/** What the composer needs. */
export interface CommentComposerProps {
  address: ChapterAddress;
  /** For a reply: the comment answered and its author's name. */
  replyTo?: { commentId: string; authorName: string };
  /** Called after a successful post, and on Cancel for a reply. */
  onDone?: () => void;
  /** For a comment on one paragraph (S1-E6-06): its number, from 1. */
  paragraph?: number;
}

/**
 * The words for a failed post.
 *
 * @param failure - the error
 * @returns the translation key and its values
 */
function failureText(failure: CommentError): [string, Record<string, unknown>] {
  if (failure.failure !== 'too_many') return [`failures.${failure.failure}`, {}];
  if (failure.waitMinutes === null) return ['failures.too_many_unknown', {}];
  return ['failures.too_many', { count: failure.waitMinutes }];
}

/**
 * The composer's state: the text, the spoiler mark and the post.
 *
 * @param props - the composer's props
 * @returns the fields, their setters, send() and the post's progress
 */
function useComposer({ address, replyTo, onDone, paragraph }: CommentComposerProps) {
  const [text, setText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [justPosted, setJustPosted] = useState(false);
  const posting = usePostComment(address);

  /** Sends the comment; on success the box empties and the list reads again. */
  async function send(event: FormEvent) {
    event.preventDefault();
    try {
      const where = paragraph === undefined ? {} : { paragraph };
      await posting.post({ body: text, isSpoiler, replyTo: replyTo?.commentId ?? null, ...where });
      setText('');
      setIsSpoiler(false);
      setJustPosted(true);
      onDone?.();
    } catch {
      // The failure is shown under the form from posting.failure; nothing else to do here.
      setJustPosted(false);
    }
  }

  return { text, setText, isSpoiler, setIsSpoiler, justPosted, posting, send };
}

/** What the line under the text box needs. */
interface ComposerControlsProps {
  composer: ReturnType<typeof useComposer>;
  counterId: string;
  isReply: boolean;
  onCancel?: () => void;
}

/**
 * "Hide as a spoiler", the counter, Cancel (replies) and the Post button.
 *
 * @returns the line under the text box
 */
function ComposerControls({ composer, counterId, isReply, onCancel }: ComposerControlsProps) {
  const { t, i18n } = useCommentsTranslation();
  const limit = new Intl.NumberFormat(i18n.language).format(longestComment);
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
  const { t } = useCommentsTranslation();
  const fieldId = useId();
  const counterId = useId();
  const composer = useComposer(props);
  const replyTo = props.replyTo;
  const isReply = replyTo !== undefined;
  // A reply and a paragraph's comment sit inside a card already, so they get no card of their own.
  const isCompact = isReply || props.paragraph !== undefined;
  const failure = composer.posting.failure;
  return (
    <form
      onSubmit={composer.send}
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
        rows={isCompact ? 2 : 3}
        maxLength={longestComment}
        value={composer.text}
        onChange={(event) => composer.setText(event.target.value)}
        placeholder={isCompact ? undefined : t('composer.placeholder')}
        aria-describedby={counterId}
        className="w-full resize-y rounded-2xl border border-control-border bg-paper px-[18px] py-3.5 text-base leading-normal text-ink"
      />
      <ComposerControls
        composer={composer}
        counterId={counterId}
        isReply={isReply}
        onCancel={props.onDone}
      />
      {failure !== null && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t(...failureText(failure))}
        </p>
      )}
      <p role="status" className="sr-only">
        {composer.justPosted ? t('composer.posted') : ''}
      </p>
      {!isCompact && <p className="m-0 text-[13px] text-meta">{t('composer.kind')}</p>}
    </form>
  );
}
