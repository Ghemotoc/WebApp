/**
 * LandingPageView: a whole landing page, its theme band with the hero, then its blocks (story
 * S1-E11-14; bundle CONTESTS-13a1).
 *
 * The look is one of four brand themes, drawn from the pill palette's tints so the text keeps at
 * least 7:1 contrast in light and night mode (criterion 2: no colour of the admin's own). From
 * the take-down date the page says it has ended above everything else (criterion 11).
 * Who shows it: LandingPageScreen for visitors, and the editor's phone and desktop previews.
 * What it calls: LandingBlockView for every block after the hero.
 */
import type { LandingContent, LandingLanguage, LandingTheme } from '@/schemas/landingPages';

import { wordsOf } from '../lib/blocks';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { LandingBlockView } from './LandingBlockView';

/** Each theme's band: a pastel tint with dark text of the same hue (pill system). */
const themeBands: Record<LandingTheme, string> = {
  plum: 'border-(--pill-plum-border) bg-(--pill-plum-bg) text-(--pill-plum-text)',
  gold: 'border-(--pill-gold-border) bg-(--pill-gold-bg) text-(--pill-gold-text)',
  sage: 'border-(--pill-sage-border) bg-(--pill-sage-bg) text-(--pill-sage-text)',
  sky: 'border-(--pill-sky-border) bg-(--pill-sky-bg) text-(--pill-sky-text)',
};

/** What the view needs. */
interface LandingPageViewProps {
  content: LandingContent;
  language: LandingLanguage;
  /** True from the take-down date: the page says it has ended. */
  hasEnded: boolean;
  /** The page's type, for the ended note ("This contest has ended"). */
  pageType: string;
}

/**
 * Renders the page.
 *
 * @returns the article
 */
export function LandingPageView({ content, language, hasEnded, pageType }: LandingPageViewProps) {
  const { t } = useLandingPageTranslation();
  // Step 1: the hero is the first block; the checks before publishing make sure there is one.
  const hero = content.blocks.find((block) => block.kind === 'hero');
  const rest = content.blocks.filter((block) => block.kind !== 'hero');
  const intro = hero === undefined ? '' : wordsOf(hero, language, 'intro');
  return (
    <article lang={language} className="flex flex-col gap-8">
      {hasEnded && (
        <p
          role="status"
          className="m-0 rounded-card border border-border bg-surface p-4 font-semibold text-ink"
        >
          {t(`ended.${pageType}`, { defaultValue: t('ended.campaign') })}
        </p>
      )}
      {/* Step 2: the theme band with the page's one h1. */}
      <header
        className={`flex flex-col gap-3 rounded-3xl border p-6 sm:p-10 ${themeBands[content.theme]}`}
      >
        <h1 className="m-0 font-heading text-[34px] leading-tight font-bold break-words sm:text-[44px]">
          {hero === undefined ? '' : wordsOf(hero, language, 'title')}
        </h1>
        {intro !== '' && <p className="m-0 max-w-[640px] text-lg">{intro}</p>}
      </header>
      {/* Step 3: every other block, in the order the admin set. */}
      <div className="flex max-w-[760px] flex-col gap-10">
        {rest.map((block) => (
          <LandingBlockView key={block.id} block={block} language={language} />
        ))}
      </div>
    </article>
  );
}
