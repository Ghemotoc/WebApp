/**
 * HelpStillStuck: the "Still stuck?" panel on the Help centre, four ways to reach a person or a
 * safety page (G5b; board Help, beside Popular questions).
 *
 * These are navigation links, like the footer, so their words are interface text from the locale
 * files rather than CMS text. Each row is one link: a bold title and a short line under it, set
 * straight on the page with a fine line between rows (bundle 10, board J25: no card, no chevron).
 * Who shows it: HelpCentrePage. What it calls: react-router's Link.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { brand } from '@/config/brand';

/** The four rows, in the board's order. */
const stillStuckLinks = [
  { href: '/support/new', key: 'support' },
  { href: '/contact', key: 'contact' },
  { href: '/report', key: 'report' },
  { href: '/legal/guidelines', key: 'safety' },
] as const;

/**
 * Renders the panel under its own heading.
 *
 * @returns the section
 */
export function HelpStillStuck() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="help-still-stuck" className="flex flex-col gap-3">
      <h2
        id="help-still-stuck"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('website.help.stillStuck.heading')}
      </h2>
      <ul className="m-0 flex list-none flex-col border-t border-hairline p-0">
        {stillStuckLinks.map((link) => (
          <li key={link.key} className="border-b border-hairline">
            <Link
              to={link.href}
              className="group flex min-h-12 flex-col gap-1 py-3 text-ink no-underline"
            >
              <span className="type-label font-semibold text-ink-heading group-hover:underline">
                {t(`website.help.stillStuck.${link.key}Title`)}
              </span>
              <span className="type-meta text-ink-muted">
                {t(`website.help.stillStuck.${link.key}Line`, { productName: brand.productName })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
