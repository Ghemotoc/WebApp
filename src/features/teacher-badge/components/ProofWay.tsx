/**
 * ProofWay: way (b), "Upload proof that you teach": the file, what we do with it and "Send proof"
 * (story S1-E2-11, criterion 4; board Onboarding 2.5, step 3).
 *
 * Who shows it: TeacherBadgeForm. What it calls: onSend(file), which useMyTeacherCheck uploads to
 * the private teacher-proofs bucket (a picture loses its location data first). Only staff who
 * check teachers can open it, and it is deleted once they decide.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { TeacherBadgeFailure } from '../api/teacherBadge';

import { TeacherBadgePill } from './TeacherBadgePill';

/** What the way needs. */
export interface ProofWayProps {
  idPrefix: string;
  isSending: boolean;
  failure: TeacherBadgeFailure | null;
  onSend: (file: File) => Promise<unknown>;
}

/**
 * The box that says what happens to the proof (board: "What we do with it").
 *
 * @returns the box
 */
function WhatWeDoWithIt() {
  const { t } = useTranslation('account');
  return (
    <div className="flex flex-col gap-1.5 rounded-[16px] bg-tint p-4">
      <strong className="text-[15px] font-bold text-ink">
        {t('teacherBadge.proof.whatTitle')}
      </strong>
      <p className="m-0 text-sm leading-relaxed text-body">{t('teacherBadge.proof.whatText')}</p>
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-relaxed text-body">
        {t('teacherBadge.proof.untilThen')} <TeacherBadgePill isPending />
      </p>
    </div>
  );
}

/**
 * Renders the way.
 *
 * @returns the file field, the box and the button
 */
export function ProofWay({ idPrefix, isSending, failure, onSend }: ProofWayProps) {
  const { t } = useTranslation('account');
  const [file, setFile] = useState<File | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const inputId = `${idPrefix}-teacher-proof`;
  const shownFailure = isMissing ? 'no_file' : failure;

  /** Sends the chosen file, or says to choose one. */
  function send() {
    setIsMissing(file === null);
    if (file !== null) void onSend(file).catch(() => undefined);
  }

  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          {t('teacherBadge.proof.label')}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          aria-describedby={`${inputId}-hint`}
          disabled={isSending}
          className="min-h-12 w-full rounded-[16px] border border-dashed border-control-border bg-surface px-4 py-2.5 text-[15px] text-ink file:mr-3 file:h-9 file:rounded-full file:border file:border-control-border file:bg-surface file:px-4 file:font-semibold file:text-heading"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p id={`${inputId}-hint`} className="m-0 text-[13px] text-meta">
          {t('teacherBadge.proof.hint')}
        </p>
      </div>
      <WhatWeDoWithIt />
      {shownFailure !== null && (
        <Notice tone="error">{t(`teacherBadge.failures.${shownFailure}`)}</Notice>
      )}
      <Button variant="secondary" className="self-start" disabled={isSending} onClick={send}>
        {isSending ? t('teacherBadge.proof.sending') : t('teacherBadge.proof.send')}
      </Button>
    </div>
  );
}
