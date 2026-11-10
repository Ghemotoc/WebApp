/**
 * HubContests: the contests the signed-in writer can enter today, each as a glass card (bundle G9
 * WRITING, part a; board WritersHub, "Contest · open now" with "Closes in 23 days", the name, its
 * tags and the contest's pills).
 *
 * The contest's full page is its landing page at /c/<slug>, so the card links there; a writer
 * enters a story from that story's settings (StoryContestCard, S1-E11-15), which the card says.
 * GAPS-12a: the card opens with the landing page's first picture (only once it passed its check
 * and a moderator approved it) and counts the entries from the first one; members can't read
 * the contests or their entries themselves, so both come from writers_hub_contests().
 * Who shows it: WritersHubPage. What it calls: hooks/useHubContests.ts and lib/hubDates.ts.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { HubContest } from '../api/hubContests';
import { useHubContests } from '../hooks/useHubContests';
import { daysUntilClose } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

/** The glass card every block of the hub sits in. */
const cardClasses =
  'flex flex-col gap-3 rounded-card border border-border bg-surface p-[clamp(20px,3vw,32px)] shadow-card';

/**
 * One contest's card.
 *
 * @param props.contest - the contest
 * @param props.now - today, for the days left
 * @returns the card
 */
function ContestCard({ contest, now }: { contest: HubContest; now: Date }) {
  const { t, i18n } = useHubTranslation();
  // Step 1: the contest's words in the interface language.
  const isRomanian = i18n.language === 'ro';
  const name = isRomanian ? contest.nameRo : contest.nameEn;
  const prize = isRomanian ? contest.prizeRo : contest.prizeEn;
  // Step 2: the days left, with "Closes today" on the last day.
  const daysLeft = daysUntilClose(contest.entriesCloseOn, now);
  const closing =
    daysLeft === 0
      ? t('hub.contests.closesToday')
      : t('hub.contests.closesIn', { count: daysLeft });
  return (
    <article aria-labelledby={`hub-contest-${contest.contestId}`} className={cardClasses}>
      {contest.coverUrl !== null && (
        <img
          src={contest.coverUrl}
          alt={isRomanian ? contest.coverAltRo : contest.coverAltEn}
          className="block max-h-[280px] w-full rounded-2xl object-cover"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>{t('hub.contests.eyebrow')}</Eyebrow>
        <InfoPill tone="gold">{closing}</InfoPill>
      </div>
      <h2
        id={`hub-contest-${contest.contestId}`}
        className="m-0 font-heading text-[clamp(24px,3vw,32px)] font-extrabold text-heading"
      >
        {name}
      </h2>
      <div className="flex flex-wrap gap-2">
        {contest.wordLimit !== null && (
          <InfoPill tone="neutral">
            {t('hub.contests.wordLimit', {
              count: contest.wordLimit,
              words: contest.wordLimit.toLocaleString(isRomanian ? 'ro' : 'en-GB'),
            })}
          </InfoPill>
        )}
        {prize !== '' && <InfoPill tone="plum">{t('hub.contests.prize', { prize })}</InfoPill>}
        {contest.entryCount > 0 && (
          <InfoPill tone="neutral">
            {t('hub.contests.entries', { count: contest.entryCount })}
          </InfoPill>
        )}
      </div>
      <p className="m-0 text-sm text-meta">{t('hub.contests.howToEnter')}</p>
      <Link
        to={`/c/${contest.pageSlug}`}
        aria-label={t('hub.contests.openLabel', { name })}
        className={buttonClassName({ variant: 'primary' }, 'self-start')}
      >
        {t('hub.contests.open')}
      </Link>
    </article>
  );
}

/**
 * Renders the open contests, or one line when none is open for this writer.
 *
 * @param props.now - today, for the days left
 * @returns the cards, a plain message when they can't be read, or the empty line
 */
export function HubContests({ now }: { now: Date }) {
  const { t } = useHubTranslation();
  const { contests, isLoaded, loadFailed } = useHubContests();
  if (loadFailed) return <Notice tone="error">{t('hub.contests.loadFailed')}</Notice>;
  if (!isLoaded) return null;
  if (contests.length === 0) {
    return (
      <section aria-labelledby="hub-contests-empty" className={cardClasses}>
        {/* A heading in eyebrow type, like the guides and tools blocks, so the outline stays whole. */}
        <h2 id="hub-contests-empty" className="eyebrow m-0">
          {t('hub.contests.emptyEyebrow')}
        </h2>
        <p className="m-0 text-body">{t('hub.contests.none')}</p>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {contests.map((contest) => (
        <ContestCard key={contest.contestId} contest={contest} now={now} />
      ))}
    </div>
  );
}
