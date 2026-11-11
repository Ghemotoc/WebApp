/**
 * PersonalDetailsNote: the gentle question a text box asks before sending words that look like a
 * phone number, an email address, a street address or a school's name (bundle MUST-1, part b;
 * IDEA-20261108-6).
 *
 * It sits under the text box, takes the focus when it opens so a screen reader reads it, and
 * offers two buttons: "Change it" (back to the text box) and "Post anyway" (sends the words as
 * typed). It never blocks anything and nothing about it is recorded (CLAUDE.md rule 19). Drawn
 * like the comment box's kind-words nudge (KindWordsNudge), so the two read as one family.
 * Who shows it: the comment, forum post, message and bio boxes, while
 * usePersonalDetailsCheck().isShown is true (PersonalDetailsGateNote for the boxes that use
 * usePersonalDetailsGate). What it calls: nothing; the buttons call the box back.
 */
import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/Button';

import type { PersonalDetailsGate } from '../hooks/usePersonalDetailsCheck';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the note needs: the two choices. */
export interface PersonalDetailsNoteProps {
  onChange: () => void;
  onPostAnyway: () => void;
  isSending: boolean;
}

/**
 * Renders the note.
 *
 * @returns the question, why it is asked, and its two buttons
 */
export function PersonalDetailsNote({
  onChange,
  onPostAnyway,
  isSending,
}: PersonalDetailsNoteProps) {
  const { t } = usePrivacyTranslation();
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
        {t('personalDetails.question')}
      </p>
      <p className="m-0 text-sm">{t('personalDetails.explain')}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onChange}>
          {t('personalDetails.change')}
        </Button>
        <Button onClick={onPostAnyway} disabled={isSending}>
          {t('personalDetails.postAnyway')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The note for a box that uses usePersonalDetailsGate: shown while the gate holds the words.
 *
 * @param props.gate - the box's gate
 * @param props.isSending - true while the box is sending, so "Post anyway" can't be pressed twice
 * @returns the note, or nothing
 */
export function PersonalDetailsGateNote({
  gate,
  isSending,
}: {
  gate: PersonalDetailsGate;
  isSending: boolean;
}) {
  if (!gate.isShown) return null;
  return (
    <PersonalDetailsNote
      onChange={gate.close}
      onPostAnyway={gate.postAnyway}
      isSending={isSending}
    />
  );
}
