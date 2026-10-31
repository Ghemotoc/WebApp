/**
 * ConsentSentPanel: "We emailed your parent or guardian", with what the writer can do meanwhile,
 * the deadline, Send the email again, Change the email and Read stories (story S1-E2-03;
 * board ParentConsent 2.4, left side, second state).
 *
 * Who shows it: ParentConsentPage, once a request is waiting.
 * What it calls: onResend() (the same email and language again: a new link replaces the old one)
 * and onChange() (back to AskParentForm).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { ConsentFailure } from '../../../schemas/parentConsent';
import type { MyParentConsent } from '../api/parentConsent';

/** What the panel needs. */
export interface ConsentSentPanelProps {
  consent: MyParentConsent;
  isSending: boolean;
  /** How the last resend went: null before one, 'sent', or the reason it failed. */
  resendState: 'sent' | ConsentFailure | null;
  onResend: () => void;
  onChange: () => void;
}

/** The class of a link drawn as a secondary button. */
const linkButtonClass =
  'inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint';

/**
 * Renders the panel.
 *
 * @returns the sent state with its three actions
 */
export function ConsentSentPanel({
  consent,
  isSending,
  resendState,
  onResend,
  onChange,
}: ConsentSentPanelProps) {
  const { t, i18n } = useTranslation('account');
  const deadline =
    consent.deadline === null ? null : formatRomaniaDate(new Date(consent.deadline), i18n.language);

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="success" title={t('parentConsent.sentHeading')}>
        {t('parentConsent.sentBody', { email: consent.parentEmail ?? '' })}
      </Notice>
      <div className="flex flex-col gap-1">
        <p className="m-0 font-semibold text-heading">{t('parentConsent.meanwhile')}</p>
        <p className="m-0 text-body">{t('parentConsent.opensAfter')}</p>
      </div>
      {deadline !== null && (
        <p className="m-0 text-body">{t('parentConsent.deadline', { date: deadline })}</p>
      )}
      {resendState === 'sent' && (
        <p className="m-0 text-sm text-meta">{t('parentConsent.sentAgain')}</p>
      )}
      {resendState !== null && resendState !== 'sent' && (
        <Notice tone="error">{t(`parentConsent.failures.${resendState}`)}</Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={isSending} onClick={onResend}>
          {t('parentConsent.sendAgain')}
        </Button>
        <Button variant="secondary" onClick={onChange}>
          {t('parentConsent.changeEmail')}
        </Button>
        <Link to="/discover" className={linkButtonClass}>
          {t('parentConsent.readStories')}
        </Link>
      </div>
    </div>
  );
}
