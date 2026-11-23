/**
 * HubContests: "Open for entries now" on the Home page, the contests the signed-in writer can
 * enter today (bundle G9 WRITING, part a; since CALM-7c the simplified board New-Home: up to
 * three columns, each under a 2 px thread line, with "Closes in 8 days" as the deadline in
 * colour, the name, a meta line and a quiet button).
 *
 * The contest's full page is its landing page at /c/<slug>, so the item links there; a writer
 * enters a story from that story's settings (StoryContestCard, S1-E11-15), which the item says.
 * GAPS-12a: the item opens with the landing page's first picture (only once it passed its check
 * and a moderator approved it) and counts the entries from the first one; members can't read
 * the contests or their entries themselves, so both come from writers_hub_contests().
 * Left out (CALM-7c): the board's "Contests and results" link, because members have no contests
 * page yet, and the description, which contests don't carry.
 * Who shows it: WritersHubPage. What it calls: hooks/useHubContests.ts and lib/hubDates.ts.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';

import type { HubContest } from '../api/hubContests';
import { useHubContests } from '../hooks/useHubContests';
import { daysUntilClose } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

type Translate = ReturnType<typeof useHubTranslation>['t'];

/**
 * The contest's facts after the deadline: the word limit, the prize and the entries so far.
 *
 * @param contest - the contest
 * @param t - the hub namespace's translate function
 * @param isRomanian - whether the interface is in Romanian
 * @returns the facts, each only when it has something to say
 */
function contestFacts(contest: HubContest, t: Translate, isRomanian: boolean): MetaFact[] {
  const facts: MetaFact[] = [];
  if (contest.wordLimit !== null) {
    facts.push({
      text: t('hub.contests.wordLimit', {
        count: contest.wordLimit,
        words: contest.wordLimit.toLocaleString(isRomanian ? 'ro' : 'en-GB'),
      }),
    });
  }
  const prize = isRomanian ? contest.prizeRo : contest.prizeEn;
  if (prize !== '') facts.push({ text: t('hub.contests.prize', { prize }) });
  if (contest.entryCount > 0) {
    facts.push({ text: t('hub.contests.entries', { count: contest.entryCount }) });
  }
  return facts;
}

/**
 * One contest: the picture, the deadline, the name, the facts and the link.
 *
 * @returns the article
 */
function ContestItem({ contest, now }: { contest: HubContest; now: Date }) {
  const { t, i18n } = useHubTranslation();
  // Step 1: the contest's words in the interface language.
  const isRomanian = i18n.language === 'ro';
  const name = isRomanian ? contest.nameRo : contest.nameEn;
  // Step 2: the days left, with "Closes today" on the last day.
  const daysLeft = daysUntilClose(contest.entriesCloseOn, now);
  const closing =
    daysLeft === 0
      ? t('hub.contests.closesToday')
      : t('hub.contests.closesIn', { count: daysLeft });
  return (
    <li className="min-w-0 border-t-2 border-thread pt-4">
      <article aria-labelledby={`hub-contest-${contest.contestId}`} className="flex flex-col gap-2">
        {contest.coverUrl !== null && (
          <img
            src={contest.coverUrl}
            alt={isRomanian ? contest.coverAltRo : contest.coverAltEn}
            className="mb-2 block max-h-[200px] w-full rounded-card object-cover"
          />
        )}
        <MetaLine facts={[{ text: closing, kind: 'deadline' }]} />
        <h3 id={`hub-contest-${contest.contestId}`} className="m-0 type-subheading">
          {name}
        </h3>
        <MetaLine facts={contestFacts(contest, t, isRomanian)} />
        <p className="m-0 text-ink-muted">{t('hub.contests.howToEnter')}</p>
        <Link
          to={`/c/${contest.pageSlug}`}
          aria-label={t('hub.contests.openLabel', { name })}
          className={buttonClassName({ variant: 'secondary' }, 'mt-2 self-start')}
        >
          {t('hub.contests.open')}
        </Link>
      </article>
    </li>
  );
}

/**
 * Renders the open contests, or one line when none is open for this writer.
 *
 * @param props.now - today, for the days left
 * @returns the section, a plain message when the contests can't be read, or nothing while loading
 */
export function HubContests({ now }: { now: Date }) {
  const { t } = useHubTranslation();
  const { contests, isLoaded, loadFailed } = useHubContests();
  if (loadFailed) return <Notice tone="error">{t('hub.contests.loadFailed')}</Notice>;
  if (!isLoaded) return null;
  return (
    <section aria-labelledby="hub-contests" className="flex flex-col gap-4">
      <h2 id="hub-contests" className="m-0 type-heading">
        {t('hub.contests.heading')}
      </h2>
      {contests.length === 0 && <p className="m-0 text-ink-muted">{t('hub.contests.none')}</p>}
      {contests.length > 0 && (
        <ul className="m-0 grid list-none gap-8 p-0 min-[900px]:grid-cols-3">
          {contests.map((contest) => (
            <ContestItem key={contest.contestId} contest={contest} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}
