/**
 * WhyWriteSection: "Why write here" on the public home page, four short cards (stories S1-E5-08
 * and S1-E11-06; board Website-Home).
 *
 * Every word comes from the published CMS version. Who uses it: WebsiteHomePage.
 */
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
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
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('website.whyEyebrow')}</Eyebrow>
        <h2
          id="why-write-heading"
          className="m-0 max-w-[720px] font-heading text-[clamp(28px,3vw,40px)] leading-[1.05] font-extrabold text-heading"
        >
          {withBrand(page.whyHeading)}
        </h2>
      </div>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-4">
        {page.whyCards.map((card) => (
          <li key={card.title} className="min-w-0">
            <Card className="flex h-full flex-col gap-2 p-5">
              <h3 className="m-0 font-heading text-lg font-bold text-heading">
                {withBrand(card.title)}
              </h3>
              <p className="m-0 leading-[1.6] text-body">{withBrand(card.body)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
