/**
 * WhyWriteSection: "Why write here" on the public home page (stories S1-E5-08 and S1-E11-06;
 * board Website-Home; bundle LOOK-2 joins the four cards into one).
 *
 * Board values: one white card with a soft border and shadow, split into four columns by thin
 * lines (two columns on tablets, one on phones), each with a doodle on top, a heading and a
 * short paragraph. The doodles are the padlock, the cloud and moon, the shield with a heart and
 * the two chat bubbles, each slightly turned. Every word comes from the published CMS version;
 * the doodles follow each card's position.
 * Who uses it: WebsiteHomePage. What it calls: Doodle.
 */
import { useTranslation } from 'react-i18next';

import { Doodle } from '@/components/ui/Doodle';
import type { DoodleName } from '@/components/ui/doodleSources';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

/** What the section needs. */
interface WhyWriteSectionProps {
  page: HomePageContent;
  language: string;
}

/** One card's doodle and its slight turn. */
interface CardDoodle {
  name: DoodleName;
  turn: string;
}

/** The first card's doodle, also used for any card past the fourth. */
const firstCardDoodle: CardDoodle = { name: 'padlock', turn: '-rotate-[4deg]' };

/** Each card's doodle, in the board's order. */
const cardDoodles: readonly CardDoodle[] = [
  firstCardDoodle,
  { name: 'cloud-and-moon', turn: 'rotate-[3deg]' },
  { name: 'shield-with-heart', turn: '-rotate-[3deg]' },
  { name: 'two-chat-bubbles', turn: 'rotate-[5deg]' },
];

/**
 * The doodle for one card.
 *
 * @param index - the card's position, from 0
 * @returns the doodle; the padlock for any card past the fourth
 */
function cardDoodle(index: number): CardDoodle {
  return cardDoodles[index] ?? firstCardDoodle;
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function WhyWriteSection({ page, language }: WhyWriteSectionProps) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="why-write-heading" lang={language} className="flex flex-col gap-6">
      <div className="flex max-w-[760px] flex-col gap-1.5">
        <Eyebrow>{t('website.whyEyebrow')}</Eyebrow>
        <h2
          id="why-write-heading"
          className="m-0 font-heading text-[clamp(28px,3vw,40px)] leading-[1.08] font-bold tracking-[-0.015em] text-heading"
        >
          {withBrand(page.whyHeading)}
        </h2>
      </div>
      {/* One joined card: each cell draws its right and bottom line, and the negative margin
          tucks the outer lines under the card's own border, so only the inner dividers show. */}
      <ul className="m-0 grid list-none overflow-hidden rounded-3xl border border-border bg-surface p-0 shadow-card md:grid-cols-2 xl:grid-cols-4">
        {page.whyCards.map((card, index) => {
          const doodle = cardDoodle(index);
          return (
            <li
              key={card.title}
              className="-mr-px -mb-px flex min-w-0 flex-col gap-2.5 border-r border-b border-hairline p-7"
            >
              <Doodle
                name={doodle.name}
                kind="widget"
                on="WhyWriteSection"
                hideBelow="always"
                className={`-ml-1 block h-14 w-14 ${doodle.turn}`}
              />
              <h3 className="m-0 font-heading text-[21px] font-bold text-ink">
                {withBrand(card.title)}
              </h3>
              <p className="m-0 text-[15px] leading-[1.6] text-body">{withBrand(card.body)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
