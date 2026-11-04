/**
 * SponsorPrinciples: the four rules at the top of Staff › Sponsors (story S1-E12-02; board
 * AdminSponsors).
 *
 * They remind staff of the rules the server already enforces: page context only, a person
 * approves every creative, never inside the text, and sponsors don't change rankings.
 * Who shows it: StaffSponsorsPage. What it calls: nothing.
 */
import { useSponsorTranslation } from '../../registerSponsorTranslations';

/** The four rules, in the board's order. */
const principleKeys = ['context', 'person', 'text', 'rankings'] as const;

/**
 * Renders the rules as a list.
 *
 * @returns the section
 */
export function SponsorPrinciples() {
  const { t } = useSponsorTranslation();
  return (
    <section aria-labelledby="sponsor-principles-heading">
      <h2 id="sponsor-principles-heading" className="sr-only">
        {t('principles.heading')}
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {principleKeys.map((key) => (
          <li key={key} className="flex flex-col gap-1 rounded-2xl border border-hairline p-4">
            <span className="font-semibold text-heading">{t(`principles.${key}.title`)}</span>
            <span className="text-sm text-body">{t(`principles.${key}.body`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
