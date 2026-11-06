/**
 * SchoolEmailWay: way (a), "Confirm your school email": the address, the live hint and "Send
 * link" (story S1-E2-11, criteria 2 and 3; board Onboarding 2.5, step 3).
 *
 * Who shows it: TeacherBadgeForm. What it calls: onSend(request), which useMyTeacherCheck sends
 * to our server; the email goes in the interface's language. The hint under the field says, as
 * the person types, whether the address looks like a school one (schoolEmailHint() in
 * src/schemas/teacherCheck.ts); a personal address is refused here and again by the database.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { cn } from '@/lib/utils';

import {
  schoolEmailHint,
  teacherLinkRequestSchema,
  type TeacherLinkRequest,
} from '../../../schemas/teacherCheck';
import type { TeacherBadgeFailure } from '../api/teacherBadge';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the way needs. */
export interface SchoolEmailWayProps {
  idPrefix: string;
  isSending: boolean;
  failure: TeacherBadgeFailure | null;
  onSend: (request: TeacherLinkRequest) => Promise<unknown>;
}

/**
 * The live line under the field: nothing while empty, a warning for a personal address.
 *
 * @returns the line's text key and whether it warns, or null for an empty field
 */
function hintLine(email: string): { key: string; isWarning: boolean } | null {
  const hint = schoolEmailHint(email);
  if (hint === 'empty') return null;
  return { key: `teacherBadge.email.status.${hint}`, isWarning: hint === 'personal' };
}

/**
 * Renders the way.
 *
 * @returns the field, the live line, the hint and the button
 */
export function SchoolEmailWay({ idPrefix, isSending, failure, onSend }: SchoolEmailWayProps) {
  const { t, i18n } = useTranslation('account');
  const [email, setEmail] = useState('');
  // A refusal found here, before anything is sent; the server's own comes in `failure`.
  const [localFailure, setLocalFailure] = useState<TeacherBadgeFailure | null>(null);
  const shownFailure = localFailure ?? failure;
  const line = hintLine(email);
  const fieldId = `${idPrefix}-teacher-email`;

  /** Checks the address here first; a personal one is never sent. */
  function submit(event: FormEvent) {
    event.preventDefault();
    const language = i18n.language.startsWith('en') ? 'en' : 'ro';
    const parsed = teacherLinkRequestSchema.safeParse({ schoolEmail: email, language });
    if (!parsed.success) {
      setLocalFailure('invalid');
      return;
    }
    if (schoolEmailHint(email) === 'personal') {
      setLocalFailure('personal_address');
      return;
    }
    setLocalFailure(null);
    void onSend(parsed.data).catch(errorShownByHook);
  }

  return (
    <form noValidate onSubmit={submit} className="flex max-w-[560px] flex-col gap-2">
      <TextInput
        id={fieldId}
        type="email"
        autoComplete="email"
        label={t('teacherBadge.email.label')}
        placeholder={t('teacherBadge.email.placeholder')}
        hint={t('teacherBadge.email.hint')}
        value={email}
        aria-describedby={`${fieldId}-status ${fieldId}-hint`}
        onChange={(event) => setEmail(event.target.value)}
      />
      <p
        id={`${fieldId}-status`}
        aria-live="polite"
        className={cn(
          'm-0 min-h-5 text-sm',
          line?.isWarning === true ? 'text-destructive' : 'text-meta',
        )}
      >
        {line === null ? '' : t(line.key)}
      </p>
      {shownFailure !== null && (
        <Notice tone="error">{t(`teacherBadge.failures.${shownFailure}`)}</Notice>
      )}
      <Button type="submit" variant="secondary" className="self-start" disabled={isSending}>
        {isSending ? t('teacherBadge.email.sending') : t('teacherBadge.email.send')}
      </Button>
    </form>
  );
}
