/**
 * KindWordsNudge: the gentle question the comment box asks when a comment holds a word from the
 * nudge lists (bundle ADMIN-2, part d3; Robert, 2 Nov 2026, 22:10).
 *
 * It sits under the text box, takes the focus when it opens so a screen reader reads it, and
 * offers two buttons: "Edit" (back to the text box) and "Send anyway" (sends the comment as
 * typed). It never blocks a comment and nothing about it is recorded (CLAUDE.md rule 19).
 * Who shows it: CommentComposer. What it calls: nothing; the buttons call the composer back.
 */
import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/Button';

import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the nudge needs: the two choices. */
export interface KindWordsNudgeProps {
  onEdit: () => void;
  onSendAnyway: () => void;
  isSending: boolean;
}

/**
 * Renders the nudge.
 *
 * @returns the question and its two buttons
 */
export function KindWordsNudge({ onEdit, onSendAnyway, isSending }: KindWordsNudgeProps) {
  const { t } = useCommentsTranslation();
  const questionId = useId();
  const questionRef = useRef<HTMLParagraphElement>(null);

  // Move the focus to the question when it opens, so it is read out and the buttons are next.
  useEffect(() => {
    questionRef.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      className="flex flex-col gap-3 rounded-2xl border border-(--info-border) bg-(--info-bg) px-[18px] py-3.5 text-(--info-text)"
    >
      <p
        id={questionId}
        ref={questionRef}
        tabIndex={-1}
        className="m-0 text-[15px] font-semibold outline-none"
      >
        {t('nudge.question')}
      </p>
      <p className="m-0 text-sm">{t('nudge.explain')}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onEdit}>
          {t('nudge.edit')}
        </Button>
        <Button onClick={onSendAnyway} disabled={isSending}>
          {t('nudge.sendAnyway')}
        </Button>
      </div>
    </div>
  );
}
