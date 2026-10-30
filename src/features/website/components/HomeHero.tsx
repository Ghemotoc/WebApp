/**
 * HomeHero: the top of the public home page (stories S1-E5-08 and S1-E11-06; board
 * Website-Home, 1.1).
 *
 * Board values: a Cutive eyebrow, the Bricolage headline on two lines with a gold underline under
 * the chosen word, the lede, two pill buttons and three short points. Every word comes from the
 * published CMS version (never the locale files, decided 17 Oct 2026, 19:14); the `lang`
 * attribute is the copy's language, which can differ from the interface after a fallback
 * (WCAG 2.2, 3.1.2). The cover wall and doodles of the board are left out: the hero is text only.
 * Who uses it: WebsiteHomePage. What it calls: HeadlineLine.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { useSession } from '@/features/auth/hooks/useSession';
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

import { HeadlineLine } from './HeadlineLine';

/** What the hero needs. */
interface HomeHeroProps {
  page: HomePageContent;
  language: string;
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
    'inline-flex min-h-[52px] items-center rounded-full px-7 text-base font-semibold no-underline';
  return (
    <div className="flex flex-wrap items-center gap-3.5">
      <Link to={writeAddress} className={`${pill} bg-primary text-on-primary hover:opacity-90`}>
        {withBrand(page.primaryButton)}
      </Link>
      <Link
        to="/discover"
        className={`${pill} border border-control-border bg-surface text-heading hover:bg-tint`}
      >
        {withBrand(page.secondaryButton)}
      </Link>
    </div>
  );
}

/**
 * Renders the hero.
 *
 * @returns the hero section
 */
export function HomeHero({ page, language }: HomeHeroProps) {
  return (
    <header lang={language} className="flex max-w-[720px] flex-col gap-6">
      <Eyebrow>{withBrand(page.eyebrow)}</Eyebrow>
      <h1 className="m-0 font-heading text-[clamp(46px,6vw,92px)] leading-[0.94] font-extrabold tracking-[-0.025em] break-words text-heading">
        {/* Two lines as blocks with a space between, so the heading reads as one sentence. */}
        <span className="block">
          <HeadlineLine line={withBrand(page.headlineFirst)} underlinedWord={page.underlinedWord} />
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
      <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2.5 p-0 text-[15px] text-ink">
        {page.points.map((point) => (
          <li key={point} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold" />
            {withBrand(point)}
          </li>
        ))}
      </ul>
    </header>
  );
}
