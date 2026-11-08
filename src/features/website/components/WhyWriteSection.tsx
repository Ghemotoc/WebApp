/**
 * WhyWriteSection: "Why write here" on the public home page (stories S1-E5-08 and S1-E11-06;
 * board Website-Home; bundle LOOK-2 joins the four cards into one).
 *
 * Board values: one white card with a soft border and shadow, split into four columns by thin
 * lines (two columns on tablets, one on phones), each with a heading and a short paragraph (no
 * doodles in the liquid glass design, bundle G4). Every word comes from the published CMS version.
 * Who uses it: WebsiteHomePage. What it calls: withBrand.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

/** What the section needs. */
interface WhyWriteSectionProps {
  page: HomePageContent;
  language: string;
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
        {page.whyCards.map((card) => {
          return (
            <li
              key={card.title}
              className="-mr-px -mb-px flex min-w-0 flex-col gap-2.5 border-r border-b border-hairline p-7"
            >
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
