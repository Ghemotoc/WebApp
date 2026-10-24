/**
 * AccountSanctions: "Reported account", the sanction history of the account a case is about,
 * with "Lift" on each live one (story S1-E10-06; board 8.3's "Reported account" panel and board
 * 8.5's "Sanctions history").
 *
 * Who shows it: CasePage, and the admin site's account page (S1-E11-02) with its own heading.
 * What it calls: lift() from useSanctions, or from useAccountActions on the account page.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { AccountSanction } from '../api/sanctions';
import type { useSanctions } from '../hooks/useSanctions';

import { ReasonForm } from './ReasonForm';

/** The part of useSanctions's result the panel uses; useAccountActions gives the same shape. */
type Sanctions = Pick<
  ReturnType<typeof useSanctions>,
  'sanctions' | 'lift' | 'liftFailure' | 'isBusy'
>;

/**
 * The small line under a sanction: who applied it, when, from which case, and until when.
 *
 * @returns the line's text
 */
function SanctionMeta({ sanction }: { sanction: AccountSanction }) {
  const { t, i18n } = useTranslation('moderation');
  const whenText = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(isoTime),
    );
  const appliedBy = t('sanctions.appliedBy', {
    handle: sanction.appliedByHandle ?? t('case.noHandle'),
    when: whenText(sanction.startsAt),
    reference: sanction.caseReference ?? t('sanctions.noCase'),
  });
  // A warning has no end; a ban's end is "none"; a suspension or pause ends on a date.
  if (sanction.kind === 'warning') return <p className="m-0 text-sm text-meta">{appliedBy}</p>;
  const until =
    sanction.endsAt === null
      ? t('sanctions.noEnd')
      : t('sanctions.until', { when: whenText(sanction.endsAt) });
  return <p className="m-0 text-sm text-meta">{`${appliedBy} ${until}`}</p>;
}

/**
 * One sanction and, while live, its Lift action.
 *
 * @returns a list item
 */
function SanctionRow({ sanction, sanctions }: { sanction: AccountSanction; sanctions: Sanctions }) {
  const { t } = useTranslation('moderation');
  const [isLiftOpen, setIsLiftOpen] = useState(false);
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-heading">{t(`sanctions.kinds.${sanction.kind}`)}</span>
        {sanction.isLive && <InfoPill tone="blush">{t('sanctions.live')}</InfoPill>}
        {sanction.liftedAt !== null && <InfoPill tone="neutral">{t('sanctions.lifted')}</InfoPill>}
      </div>
      <SanctionMeta sanction={sanction} />
      <p className="m-0 text-body">{sanction.note}</p>
      {sanction.isLive && !isLiftOpen && (
        <div>
          <Button variant="secondary" onClick={() => setIsLiftOpen(true)}>
            {t('sanctions.lift')}
          </Button>
        </div>
      )}
      {sanction.isLive && isLiftOpen && (
        <ReasonForm
          id={`lift-${sanction.id}`}
          label={t('sanctions.liftReason')}
          confirmLabel={t('sanctions.liftConfirm')}
          isBusy={sanctions.isBusy}
          onConfirm={(reason) => sanctions.lift(sanction.id, reason)}
          onCancel={() => setIsLiftOpen(false)}
        />
      )}
    </li>
  );
}

/**
 * Renders the panel.
 *
 * @param props.sanctions - the sanctions and lift()
 * @param props.heading - the heading, when not "Reported account: sanctions"
 * @returns the section
 */
export function AccountSanctions({
  sanctions,
  heading,
}: {
  sanctions: Sanctions;
  heading?: string;
}) {
  const { t } = useTranslation('moderation');
  return (
    <section aria-labelledby="account-sanctions-heading" className="flex flex-col gap-4">
      <h2
        id="account-sanctions-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {heading ?? t('sanctions.heading')}
      </h2>
      {sanctions.liftFailure !== null && (
        <Notice tone="error">{t(`failures.${sanctions.liftFailure}`)}</Notice>
      )}
      {sanctions.sanctions.length === 0 && <p className="m-0 text-body">{t('sanctions.none')}</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {sanctions.sanctions.map((sanction) => (
          <SanctionRow key={sanction.id} sanction={sanction} sanctions={sanctions} />
        ))}
      </ul>
    </section>
  );
}
