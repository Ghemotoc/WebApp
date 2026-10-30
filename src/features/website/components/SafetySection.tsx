/**
 * SafetySection: the safety lines on the public home page (stories S1-E5-08 and S1-E11-06; board
 * Website-Home): the Yoti line and the one messaging line (Q6, Q13).
 *
 * Both lines come from the CMS, so an admin keeps them true for the moment (S1-E5-08 legal note:
 * no Yoti claim while the check isn't live). Who uses it: WebsiteHomePage.
 */
import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../lib/brandText';

/** What the section needs. */
interface SafetySectionProps {
  page: HomePageContent;
  language: string;
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function SafetySection({ page, language }: SafetySectionProps) {
  return (
    <section
      aria-labelledby="safety-heading"
      lang={language}
      className="flex flex-col gap-4 rounded-3xl bg-panel p-6 md:p-8"
    >
      <h2 id="safety-heading" className="m-0 font-heading text-[26px] font-extrabold text-heading">
        {withBrand(page.safetyHeading)}
      </h2>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {page.safetyLines.map((line) => (
          <li key={line} className="m-0 text-[17px] leading-[1.6] text-ink">
            {withBrand(line)}
          </li>
        ))}
      </ul>
    </section>
  );
}
