/**
 * HomeHero: the top of the public home page (stories S1-E5-08 and S1-E11-06; board
 * Website-Home, 1.1; the cover wall from bundle LOOK-2).
 *
 * Board values: two columns that wrap on narrow screens. On the left, an eyebrow, the Bricolage
 * headline on two lines with a gold underline under the chosen word, the lede, two pill buttons
 * with their doodle icons (the pen on "Start writing", the open book on "Start reading") and
 * three short points with the padlock, shield and book icons. On the right, the cover wall
 * (HeroCollage). Every word comes from the published CMS version (never the locale files,
 * decided 17 Oct 2026, 19:14); the `lang` attribute is the copy's language, which can differ
 * from the interface after a fallback (WCAG 2.2, 3.1.2).
 * Who uses it: WebsiteHomePage. What it calls: HeadlineLine and HeroCollage.
 */
import { Link } from 'react-router';

import bookIcon from '@/assets/icons/book.svg';
import drawingIcon from '@/assets/icons/drawing.svg';
import lockIcon from '@/assets/icons/lock.svg';
import openBookIcon from '@/assets/icons/open-book.svg';
import shieldIcon from '@/assets/icons/shield.svg';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { useSession } from '@/features/auth/hooks/useSession';
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

import { HeadlineLine } from './HeadlineLine';
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
const pointIcons: readonly string[] = [lockIcon, shieldIcon, bookIcon];

/**
 * The icon for one point.
 *
 * @param index - the point's position, from 0
 * @returns the icon's address; the book for any point past the third
 */
function pointIcon(index: number): string {
  return pointIcons[index] ?? bookIcon;
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
    'inline-flex min-h-[52px] items-center gap-2.5 rounded-full text-base font-semibold no-underline';
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3.5">
      <Link
        to={writeAddress}
        className={`${pill} bg-primary pr-[30px] pl-[18px] text-on-primary hover:opacity-90`}
      >
        {/* The pen sits in a pale circle, as on the board, so it shows on the dark button. */}
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#FBF7EC]"
        >
          <img src={drawingIcon} alt="" className="h-6 w-6" />
        </span>
        {withBrand(page.primaryButton)}
      </Link>
      <Link
        to="/discover"
        className={`${pill} border border-control-border bg-surface pr-7 pl-[22px] text-heading hover:bg-tint`}
      >
        <img src={openBookIcon} alt="" aria-hidden="true" className="h-[26px] w-[26px] flex-none" />
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
    <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[15px] text-ink">
      {points.map((point, index) => (
        <li key={point} className="inline-flex items-center gap-2">
          <img src={pointIcon(index)} alt="" aria-hidden="true" className="h-6 w-6 flex-none" />
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
    <header lang={language} className="flex flex-wrap items-center gap-[clamp(40px,5vw,72px)]">
      {/* Step 1: the words, on the left (or on top on narrow screens). */}
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
        <Eyebrow>{withBrand(page.eyebrow)}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(46px,6vw,92px)] leading-[0.94] font-extrabold tracking-[-0.025em] break-words text-heading">
          {/* Two lines as blocks with a space between, so the heading reads as one sentence. */}
          <span className="block">
            <HeadlineLine
              line={withBrand(page.headlineFirst)}
              underlinedWord={page.underlinedWord}
            />
          </span>{' '}
          <span className="block">
            <HeadlineLine
              line={withBrand(page.headlineSecond)}
              underlinedWord={page.underlinedWord}
            />
          </span>
        </h1>
        <p className="m-0 max-w-[560px] text-[19px] leading-[1.65] text-body">
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
