/**
 * LandingHero: the top of a landing page as board A10 draws it (BOOKS-A10, user story 1.10): a
 * box with a kicker line, the page's one h1 (its second line in violet), the introduction, one
 * main button and "How it works", and on the right the live count of words written this month.
 *
 * Buttons (story 1.10): a visitor sees the visitor's button ("Join for free"), which opens Sign
 * up with the hero's link remembered (/sign-up?next=/hub), so the new member lands there after
 * setup; a signed-in member sees the member's button ("Join writing month"), which opens the link.
 * Once the page has ended both go to Read. "How it works" jumps to the page's first Steps block.
 * The live count reads again every minute and is rounded to one decimal ("21.6M").
 * Who shows it: LandingPageView. What it calls: useSession, useLandingWordsThisMonth and
 * LandingPicture.
 */
import { useSession } from '@/features/auth/hooks/useSession';
import { buttonClassName } from '@/components/ui/buttonStyles';
import type {
  LandingBlock,
  LandingContent,
  LandingLanguage,
  LandingTheme,
} from '@/schemas/landingPages';
import { safeLandingLink } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { useLandingWordsThisMonth } from '../hooks/useLandingWordsThisMonth';
import { wordsOf } from '../lib/blocks';
import { landingBlockAnchor } from '../lib/anchors';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { LandingPicture } from './LandingPicture';

/** What the hero needs. */
interface LandingHeroProps {
  hero: LandingBlock | undefined;
  content: LandingContent;
  theme: LandingTheme;
  language: LandingLanguage;
  hasEnded: boolean;
  extras: LandingExtras;
  isPreview: boolean;
}

/**
 * Each theme's box: plum is the board's plain box (box surface); the others take a pill tint and
 * its edge, under the same dark text, which keeps at least 7:1 (S1-E11-14 criterion 2).
 */
const themeBoxes: Record<LandingTheme, string> = {
  plum: 'border-border bg-surface',
  gold: 'border-(--pill-gold-border) bg-(--pill-gold-bg)',
  sage: 'border-(--pill-sage-border) bg-(--pill-sage-bg)',
  sky: 'border-(--pill-sky-border) bg-(--pill-sky-bg)',
};

/** Where the buttons go once a page has ended: Read (story 1.10). */
const readPath = '/discover';

/**
 * The main button: the visitor's or the member's, or nothing when the hero has none.
 *
 * @returns the link styled as the main button, or null
 */
function HeroButton({ hero, language, hasEnded }: LandingHeroProps) {
  const { userId } = useSession();
  if (hero === undefined) return null;
  // Step 1: the words for who is looking; a member falls back to the visitor's words.
  const visitorLabel = wordsOf(hero, language, 'button_label');
  const memberLabel = wordsOf(hero, language, 'member_button_label');
  const isMember = userId !== null;
  const label = isMember && memberLabel !== '' ? memberLabel : visitorLabel;
  if (label === '') return null;
  // Step 2: where it goes: Read once ended, the link for a member, Sign up for a visitor.
  const link = safeLandingLink(hero.link);
  let href = isMember ? link : `/sign-up?next=${encodeURIComponent(link)}`;
  if (hasEnded) href = readPath;
  return (
    <a href={href} className={buttonClassName({ variant: 'primary' })}>
      {label}
    </a>
  );
}

/**
 * "How it works": a text link to the page's first Steps block, when it has one.
 *
 * @returns the link, or null
 */
function HowItWorks({ content }: Pick<LandingHeroProps, 'content'>) {
  const { t } = useLandingPageTranslation();
  const steps = content.blocks.find((block) => block.kind === 'steps');
  if (steps === undefined) return null;
  return (
    <a
      href={`#${landingBlockAnchor(steps)}`}
      className="inline-flex min-h-11 items-center type-label font-semibold text-ink-heading underline"
    >
      {t('hero.howItWorks')}
    </a>
  );
}

/**
 * The live count: "Live count", the rounded total and "words written so far this month". Nothing
 * while it loads, fails or has fewer than five writers behind it.
 *
 * @returns the block, or null
 */
function LiveCount({ hero, language, isPreview }: LandingHeroProps) {
  const { t } = useLandingPageTranslation();
  const isOn = hero?.live_count === true && !isPreview;
  const count = useLandingWordsThisMonth(isOn);
  if (!isOn || count.data === undefined || count.data === null) return null;
  // One decimal in the compact form: 21,634,000 reads 21.6M (story 1.10).
  const rounded = new Intl.NumberFormat(language, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(count.data);
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <p className="m-0 type-label font-semibold text-ink-heading">{t('hero.liveCount')}</p>
      <p className="m-0 font-heading type-display font-bold text-ink-heading">{rounded}</p>
      <p className="m-0 type-body text-ink-muted">{t('hero.wordsSoFar')}</p>
    </div>
  );
}

/**
 * Renders the hero box.
 *
 * @returns the header
 */
export function LandingHero(props: LandingHeroProps) {
  const { hero, language, extras, isPreview } = props;
  const kicker = hero === undefined ? '' : wordsOf(hero, language, 'kicker');
  const accent = hero === undefined ? '' : wordsOf(hero, language, 'title_accent');
  const intro = hero === undefined ? '' : wordsOf(hero, language, 'intro');
  return (
    <header
      className={`grid gap-8 rounded-card border p-6 shadow-card sm:p-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center ${themeBoxes[props.theme]}`}
    >
      <div className="flex min-w-0 flex-col gap-4">
        {kicker !== '' && <p className="m-0 type-meta text-ink-muted">{kicker}</p>}
        <h1 className="m-0 font-heading type-title font-bold break-words text-ink-heading lg:type-display">
          {hero === undefined ? '' : wordsOf(hero, language, 'title')}
          {/* The second line in violet, as the board's headlines draw it. */}
          {accent !== '' && <span className="block text-accent">{accent}</span>}
        </h1>
        {intro !== '' && <p className="m-0 type-body text-ink-muted">{intro}</p>}
        <div className="flex flex-wrap items-center gap-6">
          <HeroButton {...props} />
          <HowItWorks content={props.content} />
        </div>
        {hero !== undefined && (
          <LandingPicture
            block={hero}
            language={language}
            pictures={extras.pictures}
            isPreview={isPreview}
          />
        )}
      </div>
      <LiveCount {...props} />
    </header>
  );
}
