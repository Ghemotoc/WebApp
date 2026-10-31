/**
 * TeacherBadgePanel: the badge's status and the form to ask for it, shared by onboarding step 3
 * and Settings (story S1-E2-11).
 *
 * Who shows it: TeacherStep and TeacherBadgeSection. What it shows:
 * - before anything is sent here: where the badge stands (TeacherBadgeStatus), then the form
 *   while the person may ask;
 * - once something is sent: the board's note (SentNote, "Link sent to …" or "Thanks, we've got
 *   it"), in a live region so a screen reader hears it, and the form again while a new link may
 *   still be asked for.
 */
import { useState } from 'react';

import type { MyTeacherCheck } from '../api/teacherBadge';
import type { useMyTeacherCheck } from '../hooks/useMyTeacherCheck';

import { SentNote, type SentNoteKind } from './SentNote';
import { TeacherBadgeForm } from './TeacherBadgeForm';
import { TeacherBadgeStatus } from './TeacherBadgeStatus';

/** What the panel needs. */
export interface TeacherBadgePanelProps {
  idPrefix: string;
  teacherCheck: MyTeacherCheck;
  state: ReturnType<typeof useMyTeacherCheck>;
}

/**
 * Renders the panel.
 *
 * @returns the status or the note, and the form
 */
export function TeacherBadgePanel({ idPrefix, teacherCheck, state }: TeacherBadgePanelProps) {
  const [sent, setSent] = useState<SentNoteKind | null>(null);
  return (
    <div className="flex flex-col gap-6">
      {sent === null && <TeacherBadgeStatus teacherCheck={teacherCheck} />}
      {teacherCheck.canAsk && (
        <TeacherBadgeForm idPrefix={idPrefix} state={state} onSent={setSent} />
      )}
      <div aria-live="polite">{sent !== null && <SentNote sent={sent} />}</div>
    </div>
  );
}
