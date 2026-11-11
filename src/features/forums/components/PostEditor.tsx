/**
 * PostEditor: the text box for a forum post, with its formatting note, counter and any refusal
 * (bundle FORUMS-1, part b; S1-E8-02; board 5.2 "Your reply").
 *
 * Board values: a 16 px-cornered box on the paper colour, at least five lines, "Simple formatting
 * only: bold, italic, links, quotes and lists." under it in 13 px. The note and the counter are
 * linked to the box with aria-describedby, so a screen reader hears them with the field; a
 * refusal about the words sits under the box and is linked the same way (aria-invalid set).
 * GAPS-16b puts the board's formatting toolbar (Bold, Italic, Add a link, Quote, List) on top of
 * the box, both inside one 20 px-rounded frame, and Ctrl+B and Ctrl+I work in the box.
 * Who uses it: NewThreadPage, ReplyForm and PostEditForm.
 */
import { useRef } from 'react';

import { normaliseTypedText } from '@/lib/romanian-text';
import { cn } from '@/lib/utils';

import { usePostFormatting } from '../hooks/usePostFormatting';
import { useForumsTranslation } from '../registerForumsTranslations';

import { PostFormatToolbar } from './PostFormatToolbar';

/** The longest post (the database setting forum_post_max_characters; a proposal). */
export const longestPost = 15000;

/** What the editor needs. */
export interface PostEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The refusal about the words, already in the reader's language, or null. */
  problem: string | null;
}

/**
 * Renders the label, the box, the note and the counter.
 *
 * @returns the field group
 */
export function PostEditor({ id, label, value, onChange, problem }: PostEditorProps) {
  const { t, i18n } = useForumsTranslation();
  const box = useRef<HTMLTextAreaElement>(null);
  const formatting = usePostFormatting(box, value, onChange, longestPost);
  const limit = new Intl.NumberFormat(i18n.language).format(longestPost);
  const count = new Intl.NumberFormat(i18n.language).format(value.length);
  const describedBy = [`${id}-help`, `${id}-counter`, problem === null ? '' : `${id}-problem`]
    .filter((part) => part !== '')
    .join(' ');
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div
        className={cn(
          'rounded-[20px] border border-control-border bg-paper',
          problem !== null && 'border-destructive',
        )}
      >
        <PostFormatToolbar controls={id} onFormat={formatting.format} />
        <textarea
          ref={box}
          id={id}
          value={value}
          rows={6}
          maxLength={longestPost}
          aria-describedby={describedBy}
          aria-invalid={problem === null ? undefined : true}
          onKeyDown={formatting.onKeyDown}
          onChange={(event) => {
            // Typed or pasted ş and ţ become ș and ț straight away (CLAUDE.md rule 4).
            normaliseTypedText(event.target);
            onChange(event.target.value);
          }}
          className="block min-h-36 w-full resize-y rounded-b-[20px] border-0 bg-transparent px-[18px] py-3.5 font-body text-[15px] leading-normal text-ink"
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p id={`${id}-help`} className="m-0 text-[13px] text-meta">
          {t('editor.help')}
        </p>
        <p id={`${id}-counter`} className="m-0 text-[13px] text-meta">
          <span aria-hidden="true">{t('editor.counter', { count, limit })}</span>
          <span className="sr-only">{t('editor.counterLabel', { count, limit })}</span>
        </p>
      </div>
      {problem !== null && (
        <p id={`${id}-problem`} className="m-0 text-sm font-semibold text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
