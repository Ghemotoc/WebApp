/**
 * HubHero: the top of the Home page, the Writers' hub (bundle G9 WRITING, part a; since CALM-7c
 * the simplified board New-Home: the page's one frosted hero).
 *
 * Left: "Friday 7 November · Writing month, day 7", "Welcome back," with "Lia." on its own line
 * in the accent colour (board A01), one line on what waits
 * (the latest draft's chapter, the contests closing this month) and two actions: "Keep writing
 * chapter 8" (the page's one main button) and "Start a new story" (quiet). With no draft, "Start
 * a new story" is the main button. Right, from 900 px: the story read last (HubHeroContinue) beside
 * the writing month (HubMonthSummary), each on its own paper.
 * Who shows it: MemberHomePage. What it calls: useMyNames (the pen name, else the username),
 * useDiscoverCards (the latest draft, my_discover_cards()), useHubContests, lib/hubDates.ts,
 * lib/monthPace.ts, HubHeroContinue and HubMonthSummary.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { Hero } from '@/components/ui/Hero';
import { MetaLine } from '@/components/ui/MetaLine';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';
import type { DraftCardData } from '@/features/discovery/api/discoverCards';
import { useDiscoverCards } from '@/features/discovery/hooks/useDiscoverCards';
import { romaniaNowFields } from '@/lib/romania-time';

import { useHubContests } from '../hooks/useHubContests';
import { formatHubDay } from '../lib/hubDates';
import { writingMonthDay } from '../lib/monthPace';
import { useHubTranslation } from '../registerHubTranslations';

import { HubHeroContinue } from './HubHeroContinue';
import { HubMonthSummary } from './HubMonthSummary';

/**
 * Counts the open contests whose entries close in this calendar month (Romania time, as contests
 * open and close, S1-E11-15).
 *
 * @param now - today
 * @returns the count, 0 while the contests load
 */
function useContestsClosingThisMonth(now: Date): number {
  const { contests } = useHubContests();
  // "YYYY-MM" of today on the Bucharest calendar; a contest closing this month starts with it.
  const thisMonth = romaniaNowFields(now).date.slice(0, 7);
  return contests.filter((contest) => contest.entriesCloseOn.startsWith(thisMonth)).length;
}

/**
 * The line under the greeting: what waits, or a short invitation when nothing does.
 *
 * @param props.draft - the latest draft, or null
 * @param props.closingCount - the contests closing this month
 * @returns the paragraph
 */
function WaitingLine({
  draft,
  closingCount,
}: {
  draft: DraftCardData | null;
  closingCount: number;
}) {
  const { t } = useHubTranslation();
  // Step 1: each part on its own, so either can be missing.
  const parts: string[] = [];
  if (draft !== null) {
    parts.push(t('hub.home.waiting', { number: draft.number, story: draft.storyTitle }));
  }
  if (closingCount > 0) parts.push(t('hub.home.contestsClosing', { count: closingCount }));
  // Step 2: nothing waits, so the line invites a first piece instead.
  if (parts.length === 0) parts.push(t('hub.home.fresh'));
  return <p className="m-0 max-w-[52ch] text-ink-muted">{parts.join(' ')}</p>;
}

/**
 * The two actions: carry on with the draft (main) and start a new story (quiet), or only the new
 * story as the main button when there is no draft (one main button a screen, CALM-2).
 *
 * @param props.draft - the latest draft, or null
 * @returns the row of links
 */
function HeroActions({ draft }: { draft: DraftCardData | null }) {
  const { t } = useHubTranslation();
  const newStoryLook = draft === null ? 'primary' : 'secondary';
  return (
    <div className="flex flex-wrap gap-3">
      {draft !== null && (
        <Link
          to={`/write/s/${encodeURIComponent(draft.storySlug)}/c/${draft.chapterCode}`}
          className={buttonClassName({ variant: 'primary' })}
        >
          {t('hub.home.keepWriting', { number: draft.number })}
        </Link>
      )}
      <Link to="/write/new" className={buttonClassName({ variant: newStoryLook })}>
        {t('hub.home.newStory')}
      </Link>
    </div>
  );
}

/**
 * Renders the hero. The page's one h1 is here.
 *
 * @param props.now - today, passed in so tests can fix the date
 * @returns the hero
 */
export function HubHero({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const { names } = useMyNames();
  const { cards } = useDiscoverCards();
  const closingCount = useContestsClosingThisMonth(now);
  const draft = cards?.draft ?? null;
  const name = names === null ? null : displayName(names.handle, names.penName);
  return (
    <Hero
      labelledBy="hub-heading"
      className="min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] min-[900px]:items-center min-[900px]:gap-12"
    >
      <div className="flex flex-col gap-3">
        <MetaLine
          facts={[
            { text: formatHubDay(now, i18n.language) },
            { text: t('hub.home.dayLine', { day: writingMonthDay(now) }) },
          ]}
        />
        <h1 id="hub-heading" className="m-0 break-words type-display">
          {/* Board A01: "Welcome back," then the name on its own line in the accent colour. */}
          {name === null && t('hub.home.welcomeNoName')}
          {name !== null && (
            <>
              {t('hub.home.welcomeLead')}{' '}
              <span className="block text-accent">{t('hub.home.welcomeName', { name })}</span>
            </>
          )}
        </h1>
        <WaitingLine draft={draft} closingCount={closingCount} />
        <div className="mt-3">
          <HeroActions draft={draft} />
        </div>
      </div>
      {/* Board A01: the Continue reading card beside the writing month card, each on its paper. */}
      <div className="mt-6 grid items-start gap-4 sm:grid-cols-2 min-[900px]:mt-0 [&>*:only-child]:col-span-full">
        <HubHeroContinue />
        <div className="box-surface rounded-card p-4">
          <HubMonthSummary now={now} />
        </div>
      </div>
    </Hero>
  );
}
