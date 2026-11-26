/**
 * HomeHero: the top of the public home page (stories S1-E5-08 and S1-E11-06; board
 * Website-Home, 1.1; the cover wall from bundle LOOK-2).
 *
 * Board values: two columns that wrap on narrow screens. On the left, an eyebrow, the Funnel Display
 * headline on two lines, the second in the look's accent (LOGO-2), the lede, two pill buttons
 * with their line icons (the pen on "Start writing", the open book on "Start reading") and
 * three short points with the padlock, shield and book icons (ActionIcon, since NO-DOODLES). On the right, the cover wall
 * (HeroCollage). Every word comes from the published CMS version (never the locale files,
 * decided 17 Oct 2026, 19:14); the `lang` attribute is the copy's language, which can differ
 * from the interface after a fallback (WCAG 2.2, 3.1.2).
 * Who uses it: WebsiteHomePage. What it calls: HeadlineLines and HeroCollage.
 */
import { Link } from 'react-router';

import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useSession } from '@/features/auth/hooks/useSession';
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

import { HeadlineLines } from './HeadlineLines';
import { HeroCollage } from './HeroCollage';

/** What the hero needs. */
interface HomeHeroProps {
  page: HomePageContent;
  language: string;
}

/**
 * The icon beside each of the three points, in the board's order: rights (padlock), no
 * tracking ads (shield), free to read and write (book). The points' words come from the CMS,
 * so the icons follow their position.
 */
const pointIcons: readonly ActionIconName[] = ['lock', 'shield', 'book'];

/**
 * The icon for one point.
 *
 * @param index - the point's position, from 0
 * @returns the icon's name; the book for any point past the third
 */
function pointIcon(index: number): ActionIconName {
  return pointIcons[index] ?? 'book';
}

/**
 * The two buttons: start writing (sign up, or the writer's page when signed in) and start reading.
 *
 * @returns the buttons
 */
function HeroButtons({ page }: { page: HomePageContent }) {
  const { userId } = useSession();
  const writeAddress = userId === null ? '/sign-up' : '/write/new';
  const pill =
    'inline-flex min-h-[52px] items-center gap-3 rounded-full type-body font-semibold no-underline';
  return (
    <div className="mt-1 flex flex-wrap items-center gap-4">
      <Link
        to={writeAddress}
        className={`${pill} bg-primary pr-8 pl-6 text-on-primary hover:opacity-90`}
      >
        <ActionIcon name="pen" size={22} className="flex-none" />
        {withBrand(page.primaryButton)}
      </Link>
      <Link
        to="/discover"
        className={`${pill} border border-control-border bg-surface pr-6 pl-6 text-ink-heading hover:bg-tint`}
      >
        <ActionIcon name="book" size={22} className="flex-none" />
        {withBrand(page.secondaryButton)}
      </Link>
    </div>
  );
}

/**
 * The three short points under the buttons, each with its icon.
 *
 * @returns the list
 */
function HeroPoints({ points }: { points: string[] }) {
  return (
    <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-6 gap-y-3 p-0 type-body text-ink">
      {points.map((point, index) => (
        <li key={point} className="inline-flex items-center gap-2">
          <ActionIcon name={pointIcon(index)} size={20} className="flex-none text-ink-heading" />
          {withBrand(point)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Renders the hero.
 *
 * @returns the hero section
 */
export function HomeHero({ page, language }: HomeHeroProps) {
  return (
    <header lang={language} className="flex flex-wrap items-center gap-8 lg:gap-16">
      {/* Step 1: the words, on the left (or on top on narrow screens). */}
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
        <Eyebrow>{withBrand(page.eyebrow)}</Eyebrow>
        <h1 className="m-0 type-title lg:type-display break-words text-ink-heading">
          <HeadlineLines
            first={withBrand(page.headlineFirst)}
            second={withBrand(page.headlineSecond)}
          />
        </h1>
        <p className="m-0 max-w-[560px] type-subheading leading-[1.65] text-ink-muted">
          {withBrand(page.lede)}
        </p>
        <HeroButtons page={page} />
        <HeroPoints points={page.points} />
      </div>
      {/* Step 2: the cover wall, on the right (or underneath). */}
      <HeroCollage rightsCard={page.rightsCard} />
    </header>
  );
}
