/**
 * TeacherBadgeForm: asking for the Teacher badge one of two ways (story S1-E2-11, criteria 1 to
 * 4; board Onboarding 2.5, step 3).
 *
 * Who shows it: TeacherBadgePanel. What it shows: WayPicker, then SchoolEmailWay or ProofWay.
 * It calls nothing itself: the state comes from useMyTeacherCheck, passed in so the page and the
 * form share one, and onSent tells the panel what to say once something left.
 */
import { useState } from 'react';

import type { TeacherCheckWay } from '../api/teacherBadge';
import type { useMyTeacherCheck } from '../hooks/useMyTeacherCheck';

import { ProofWay } from './ProofWay';
import { SchoolEmailWay } from './SchoolEmailWay';
import type { SentNoteKind } from './SentNote';
import { WayPicker } from './WayPicker';

/** What the form needs. */
export interface TeacherBadgeFormProps {
  /** Keeps the ids apart if the form shows twice on a page. */
  idPrefix: string;
  state: ReturnType<typeof useMyTeacherCheck>;
  onSent: (sent: SentNoteKind) => void;
}

/**
 * Renders the form.
 *
 * @returns the way picker and the chosen way
 */
export function TeacherBadgeForm({ idPrefix, state, onSent }: TeacherBadgeFormProps) {
  const [way, setWay] = useState<TeacherCheckWay>('school_email');

  /** Sends the proof, then says it arrived. */
  async function sendProof(file: File) {
    await state.sendProof(file);
    onSent({ kind: 'proof' });
  }

  /** Asks for the link, then says where it went. */
  async function sendLink(request: Parameters<typeof state.sendLink>[0]) {
    await state.sendLink(request);
    onSent({ kind: 'link', email: request.schoolEmail });
  }

  return (
    <div className="flex flex-col gap-6">
      <WayPicker idPrefix={idPrefix} chosen={way} onChoose={setWay} />
      {way === 'school_email' && (
        <SchoolEmailWay
          idPrefix={idPrefix}
          isSending={state.isSending}
          failure={state.linkFailure}
          onSend={sendLink}
        />
      )}
      {way === 'proof' && (
        <ProofWay
          idPrefix={idPrefix}
          isSending={state.isSending}
          failure={state.proofFailure}
          onSend={sendProof}
        />
      )}
    </div>
  );
}
