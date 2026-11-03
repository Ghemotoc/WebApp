/**
 * StaffContestsPage: Staff › Contests, the list of contests and "New contest" (story S1-E11-15
 * criterion 1; bundle CONTESTS-13b1).
 *
 * What it shows: every contest with its name, landing page, entry window and whether it is open,
 * each linking to its editor; and a form that starts a contest on a contest landing page that has
 * none yet. Plain staff components, no doodles (Definition of Done, design rules).
 * Who shows it: the router, at /staff/contests (owner and admin; the server refuses everyone
 * else). What it calls: useStaffContests().
 */
import { Link, useNavigate } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { StaffContest } from '../../api/contests';
import { useStaffContests } from '../../hooks/useStaffContests';
import { contestDayInWords, contestNameIn } from '../../lib/contestWords';
import { useContestTranslation } from '../../registerContestTranslations';

import { NewContestForm } from './NewContestForm';

/** One row of the list. */
function ContestRow({ contest }: { contest: StaffContest }) {
  const { t, i18n } = useContestTranslation();
  const name = contestNameIn(contest, i18n.language);
  const window =
    contest.entries_open_on === null || contest.entries_close_on === null
      ? t('staff.noDates')
      : t('staff.window', {
          from: contestDayInWords(contest.entries_open_on, i18n.language),
          to: contestDayInWords(contest.entries_close_on, i18n.language),
        });
  return (
    <tr className="border-t border-hairline">
      <td className="py-3 pr-4">
        <Link to={`/staff/contests/${contest.id}`} className="font-semibold text-link underline">
          {name === '' ? t('staff.unnamed') : name}
        </Link>
      </td>
      <td className="py-3 pr-4 text-body">/c/{contest.pageSlug}</td>
      <td className="py-3 pr-4 text-body">{window}</td>
      <td className="py-3 text-body">
        {contest.openedAt === null ? t('staff.status.draft') : t('staff.status.open')}
      </td>
    </tr>
  );
}

/** The table of contests, or a line saying there are none. */
function ContestList({ contests }: { contests: StaffContest[] }) {
  const { t } = useContestTranslation();
  if (contests.length === 0) return <p className="m-0 text-body">{t('staff.empty')}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{t('staff.listHeading')}</caption>
        <thead>
          <tr className="text-meta">
            <th scope="col" className="pb-2 pr-4 font-semibold">
              {t('staff.columns.name')}
            </th>
            <th scope="col" className="pb-2 pr-4 font-semibold">
              {t('staff.columns.page')}
            </th>
            <th scope="col" className="pb-2 pr-4 font-semibold">
              {t('staff.columns.entries')}
            </th>
            <th scope="col" className="pb-2 font-semibold">
              {t('staff.columns.status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {contests.map((contest) => (
            <ContestRow key={contest.id} contest={contest} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Contests screen
 */
export function StaffContestsPage() {
  const { t } = useContestTranslation();
  const navigate = useNavigate();
  const staff = useStaffContests();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('staff.heading')}
        </h1>
        <p className="m-0 text-body">{t('staff.intro')}</p>
      </div>
      <div className="flex max-w-[960px] flex-col gap-6">
        <NewContestForm
          staff={staff}
          onCreated={(contestId) => void navigate(`/staff/contests/${contestId}`)}
        />
        <section aria-labelledby="contest-list-heading" className="flex flex-col gap-3">
          <h2
            id="contest-list-heading"
            className="m-0 font-heading text-[22px] font-bold text-heading"
          >
            {t('staff.listHeading')}
          </h2>
          {staff.contests.isError && <Notice tone="error">{t('staff.loadFailed')}</Notice>}
          {staff.contests.data !== undefined && <ContestList contests={staff.contests.data} />}
        </section>
      </div>
    </PageContainer>
  );
}
