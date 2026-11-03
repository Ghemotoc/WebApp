/**
 * RequesterPanel: "Who is asking" on a support ticket (story S1-E11-13 criteria 1 and 12; bundle
 * ADMIN-2h1).
 *
 * The account (a link to Users) or "Email only", the age group (13 to 15, 16 to 17, 18 and over;
 * never the year of birth or the age check result) and the email, hidden until "Show" (showing
 * it is logged, architecture 1.8.3). Above it, for someone under 16, a banner with the
 * safeguarding guidance (criterion 12).
 * Who shows it: StaffSupportTicketPage. What it calls: the reveal it is given.
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { LabelRows, type LabelRow } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';

import type { TicketRequester } from '../api/staffSupportTickets';
import { isUnder16 } from '../lib/requester';
import { useSupportTranslation } from '../registerSupportTranslations';

/** What the panel needs. */
export interface RequesterPanelProps {
  requester: TicketRequester;
  revealedEmail: string | null;
  revealFailed: boolean;
  onReveal: () => void;
}

/**
 * The email row's value: the address once shown, otherwise the hidden one and "Show email".
 *
 * @returns the value
 */
function EmailValue({ requester, revealedEmail, revealFailed, onReveal }: RequesterPanelProps) {
  const { t } = useSupportTranslation();
  if (revealedEmail !== null) return <span className="break-all">{revealedEmail}</span>;
  return (
    <span className="flex flex-col items-start gap-2">
      {requester.maskedEmail !== null && <span className="break-all">{requester.maskedEmail}</span>}
      <Button variant="secondary" onClick={onReveal}>
        {t('staff.requester.showEmail')}
      </Button>
      <span className="text-sm text-meta">{t('staff.requester.emailHint')}</span>
      {revealFailed && <Notice tone="error">{t('staff.requester.emailFailed')}</Notice>}
    </span>
  );
}

/**
 * The rows: account, age group and email.
 *
 * @returns the label rows
 */
function useRows(props: RequesterPanelProps): LabelRow[] {
  const { t } = useSupportTranslation();
  const { requester } = props;
  if (requester.emailOnly || requester.userId === null || requester.handle === null) {
    return [
      { label: t('staff.requester.account'), value: t('staff.requester.emailOnly') },
      { label: t('staff.requester.email'), value: <EmailValue {...props} /> },
    ];
  }
  return [
    {
      label: t('staff.requester.account'),
      value: (
        <Link to={`/staff/users/${requester.userId}`} className="text-link underline">
          {t('staff.requester.openAccount', { handle: requester.handle })}
        </Link>
      ),
    },
    {
      label: t('staff.requester.ageGroup'),
      value: t(`staff.requester.ageGroups.${requester.ageGroup ?? 'unknown'}`),
    },
    { label: t('staff.requester.email'), value: <EmailValue {...props} /> },
  ];
}

/**
 * Renders the panel, with the under-16 banner when it applies.
 *
 * @returns the section
 */
export function RequesterPanel(props: RequesterPanelProps) {
  const { t } = useSupportTranslation();
  const rows = useRows(props);
  return (
    <section
      aria-labelledby="ticket-requester-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      {isUnder16(props.requester) && (
        <Notice tone="warning" title={t('staff.under16.title')}>
          {t('staff.under16.body')}
        </Notice>
      )}
      <h2
        id="ticket-requester-heading"
        className="m-0 font-heading text-[20px] font-bold text-heading"
      >
        {t('staff.requester.heading')}
      </h2>
      <LabelRows rows={rows} />
    </section>
  );
}
