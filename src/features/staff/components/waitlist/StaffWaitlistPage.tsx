/**
 * StaffWaitlistPage: /staff/waitlist, where an owner or admin lets people in from the waiting
 * list (bundle WAITLIST-1, story S1-E2-24; Robert, 6 Nov 2026, 17:27 UTC).
 *
 * Top to bottom: the counts (waiting, by answer, let in so far); the filters (writers or readers,
 * a country); "Let in a wave" (the next confirmed people who fit); the people who fit, with
 * "Let in selected" and paging; then, from G5a, how many people wait for each closed country to
 * open (OpeningListCounts). Each person let in gets the "You're in" email with a link to log
 * in, and the audit log names who let them in.
 * No board: plain staff components, no doodles (CLAUDE.md, Designs). Who shows it: the router,
 * inside StaffLayout. The database refuses anyone but owner and admin (admin_waitlist()).
 * What it calls: useStaffWaitlist.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useStaffWaitlist, waitlistPageSize } from '../../hooks/useStaffWaitlist';

import { OpeningListCounts } from './OpeningListCounts';
import { WaitlistFilters } from './WaitlistFilters';
import { WaitlistPeopleTable } from './WaitlistPeopleTable';
import { WaitlistWaveForm } from './WaitlistWaveForm';

/** useStaffWaitlist's result, passed down once. */
type Waitlist = ReturnType<typeof useStaffWaitlist>;

/**
 * The numbers in one line: waiting, by answer, and let in so far.
 *
 * @returns the counts
 */
function WaitlistCounts({ counts }: { counts: NonNullable<Waitlist['data']>['counts'] }) {
  const { t } = useTranslation('staff');
  return (
    <p className="m-0 text-body">
      <b>{t('waitlist.counts.waiting', { count: counts.waiting })}</b>{' '}
      {t('waitlist.counts.byAnswer', { write: counts.write, read: counts.read, both: counts.both })}{' '}
      {t('waitlist.counts.admitted', { count: counts.admitted })}
    </p>
  );
}

/**
 * The ticked people's button and the page arrows.
 *
 * @returns the row of actions under the table
 */
function TableActions({ waitlist }: { waitlist: Waitlist }) {
  const { t } = useTranslation('staff');
  const { page, setPage } = waitlist.filters;
  const matching = waitlist.data?.matching ?? 0;
  const hasNextPage = (page + 1) * waitlistPageSize < matching;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={waitlist.admitTicked}
        disabled={waitlist.ticked.length === 0 || waitlist.isAdmitting}
      >
        {t('waitlist.admitTicked', { count: waitlist.ticked.length })}
      </Button>
      <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
        {t('waitlist.previousPage')}
      </Button>
      <Button variant="secondary" disabled={!hasNextPage} onClick={() => setPage(page + 1)}>
        {t('waitlist.nextPage')}
      </Button>
    </div>
  );
}

/**
 * What goes under the heading: a refusal, an error, or the list and its actions.
 *
 * @returns the page's body
 */
function WaitlistBody({ waitlist }: { waitlist: Waitlist }) {
  const { t } = useTranslation('staff');
  if (waitlist.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('waitlist.notAllowed')}</p>;
  }
  if (waitlist.loadFailure !== null) {
    return <Notice tone="error">{t('waitlist.loadFailed')}</Notice>;
  }
  if (waitlist.data === null) return <p className="m-0 text-body">{t('waitlist.loading')}</p>;
  const { filters, data } = waitlist;
  return (
    <>
      <WaitlistCounts counts={data.counts} />
      {waitlist.admittedCount !== null && (
        <Notice tone="success">{t('waitlist.admitted', { count: waitlist.admittedCount })}</Notice>
      )}
      {waitlist.admitFailure !== null && <Notice tone="error">{t('waitlist.admitFailed')}</Notice>}
      <WaitlistFilters
        interest={filters.interest}
        country={filters.country}
        countries={data.countries}
        onInterestChange={filters.setInterest}
        onCountryChange={filters.setCountry}
      />
      <WaitlistWaveForm
        matching={data.matching}
        isAdmitting={waitlist.isAdmitting}
        onAdmit={waitlist.admitWave}
      />
      <WaitlistPeopleTable
        people={data.people}
        ticked={waitlist.ticked}
        onToggle={waitlist.toggle}
      />
      <TableActions waitlist={waitlist} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Waitlist screen
 */
export function StaffWaitlistPage() {
  const { t } = useTranslation('staff');
  const waitlist = useStaffWaitlist();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('waitlist.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('waitlist.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('waitlist.heading')}
        </h1>
        <p className="m-0 text-body">{t('waitlist.intro')}</p>
      </div>
      <div className="flex max-w-[960px] flex-col gap-6">
        <WaitlistBody waitlist={waitlist} />
        {waitlist.loadFailure === null && <OpeningListCounts />}
      </div>
    </PageContainer>
  );
}
