/**
 * HelpStillStuck: the "Still stuck?" panel on the Help centre, four ways to reach a person or a
 * safety page (G5b; board Help, beside Popular questions).
 *
 * These are navigation links, like the footer, so their words are interface text from the locale
 * files rather than CMS text. Each row is one link: a bold title, a short line under it and a
 * chevron, inside one glass card with a fine line between rows.
 * Who shows it: HelpCentrePage. What it calls: react-router's Link.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
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
        className="m-0 font-heading text-[28px] font-extrabold text-heading"
      >
        {t('website.help.stillStuck.heading')}
      </h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card">
        {stillStuckLinks.map((link) => (
          <li key={link.key} className="border-b border-hairline last:border-b-0">
            <Link
              to={link.href}
              className="flex min-h-16 items-center gap-4 px-5 py-4 text-ink no-underline hover:bg-tint"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-heading">
                  {t(`website.help.stillStuck.${link.key}Title`)}
                </span>
                <span className="text-sm text-meta">
                  {t(`website.help.stillStuck.${link.key}Line`, { productName: brand.productName })}
                </span>
              </span>
              <ChevronRightIcon className="shrink-0 text-meta" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
