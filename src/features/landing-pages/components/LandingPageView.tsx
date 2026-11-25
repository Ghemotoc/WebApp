/**
 * LandingPageView: a whole landing page, its hero box, then its blocks (story
 * S1-E11-14; bundle CONTESTS-13a1).
 *
 * Since BOOKS-A10 (board A10) the top is LandingHero: one box, the same in every theme, with the
 * live count beside the title. The plum theme is the board's plain box; gold, sage and sky tint
 * it from the pill palette (criterion 2: no colour of the admin's own). From the take-down date the page says "Ended on 30 November" above
 * everything else (criterion 11; user story 1.10).
 * Who shows it: LandingPageScreen for visitors, and the editor's phone and desktop previews.
 * What it calls: LandingHero, then LandingBlockView for every block after it.
 */
import { formatCalendarDate } from '@/lib/local-time';
import type { LandingContent, LandingLanguage } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { ContestResultsBlock } from './ContestResultsBlock';
import { LandingBlockView } from './LandingBlockView';
import { LandingHero } from './LandingHero';

/** What the view needs. */
interface LandingPageViewProps {
  content: LandingContent;
  language: LandingLanguage;
  /** True from the take-down date: the page says it has ended. */
  hasEnded: boolean;
  /** The page's type, for the ended note ("This contest has ended"). */
  pageType: string;
  /** The pictures and story cards (part a2a). */
  extras: LandingExtras;
  /** True in the editor's preview. */
  isPreview?: boolean;
  /** The take-down date (ISO), for "Ended on 30 November"; null when none was set. */
  takeDownOn?: string | null;
}

/**
 * The last day a page ran: the day before its take-down date, so writing month's page, taken
 * down on 1 December, ended on 30 November.
 *
 * @param takeDownOn - the take-down date (ISO), or null
 * @returns the last day as an ISO date, or null
 */
function lastDayOf(takeDownOn: string | null): string | null {
  if (takeDownOn === null) return null;
  const day = new Date(`${takeDownOn}T12:00:00Z`);
  if (Number.isNaN(day.getTime())) return null;
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/**
 * The line a page shows once it has ended: "This campaign has ended.", then "Ended on 30
 * November" when the date is known (story 1.10).
 *
 * @returns the status line
 */
function EndedLine({
  pageType,
  takeDownOn,
  language,
}: Pick<LandingPageViewProps, 'pageType' | 'language'> & { takeDownOn: string | null }) {
  const { t } = useLandingPageTranslation();
  const lastDay = lastDayOf(takeDownOn);
  // The type's line ("This campaign has ended."), then the last day when it is known.
  const typeLine = t(`ended.${pageType}`, { defaultValue: t('ended.campaign') });
  const text =
    lastDay === null
      ? typeLine
      : `${typeLine} ${t('ended.on', { date: formatCalendarDate(lastDay, language), lng: language })}`;
  return (
    <p
      role="status"
      className="m-0 rounded-card border border-border bg-surface p-4 font-semibold text-ink"
    >
      {text}
    </p>
  );
}

/**
 * Renders the page.
 *
 * @returns the article
 */
export function LandingPageView({
  content,
  language,
  hasEnded,
  pageType,
  extras,
  isPreview = false,
  takeDownOn = null,
}: LandingPageViewProps) {
  // Step 1: the hero is the first block; the checks before publishing make sure there is one.
  const hero = content.blocks.find((block) => block.kind === 'hero');
  const rest = content.blocks.filter((block) => block.kind !== 'hero');
  return (
    <article lang={language} className="flex flex-col gap-12">
      {hasEnded && <EndedLine pageType={pageType} takeDownOn={takeDownOn} language={language} />}
      {/* Step 2: the hero box with the page's one h1 and the live count (board A10). */}
      <LandingHero
        hero={hero}
        content={content}
        theme={content.theme}
        language={language}
        hasEnded={hasEnded}
        extras={extras}
        isPreview={isPreview}
      />
      {/* Step 3: every other block, in the order the admin set, across the page (board A10). */}
      <div className="flex min-w-0 flex-col gap-12">
        {rest.map((block) => (
          <LandingBlockView
            key={block.id}
            block={block}
            language={language}
            extras={extras}
            isPreview={isPreview}
          />
        ))}
        {/* Step 4: a contest's published results (contests part b2b). */}
        {extras.results != null && <ContestResultsBlock results={extras.results} />}
      </div>
    </article>
  );
}
