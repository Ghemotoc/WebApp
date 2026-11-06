/**
 * HomeFooterColumns: the big public footer at the end of the home page (bundle LOOK-3; board
 * Website-Home, "Footer").
 *
 * Board values: the product's name with a few words about the site (from the CMS, footerNote),
 * then three columns of links: Read, Write and talk, Help and legal. The column titles and link
 * words are interface text; the product's name comes from the brand config (names are settings).
 * The shared footer under it keeps the company line and the language and theme drop-downs. The
 * board's "For teachers" and "For partners" mail links wait for their pages.
 * Who shows it: WebsiteHomePage. What it calls: nothing beyond the router's links.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { brand } from '@/config/brand';

import { withBrand } from '../lib/brandText';

/** One link: where it goes and its words' key; a "#" address stays on this page. */
interface FooterLink {
  to: string;
  labelKey: string;
}

/** The three columns, in the board's order. */
const footerColumns: { titleKey: string; links: FooterLink[] }[] = [
  {
    titleKey: 'website.footer.read',
    links: [
      { to: '#trending', labelKey: 'website.trending' },
      { to: '#completed', labelKey: 'website.completed' },
      { to: '#writers', labelKey: 'website.footer.newWriters' },
      { to: '/discover', labelKey: 'nav.discover' },
    ],
  },
  {
    titleKey: 'website.footer.writeAndTalk',
    links: [
      { to: '/write/new', labelKey: 'website.footer.startWriting' },
      { to: '#first-story', labelKey: 'website.footer.firstStory' },
      { to: '/forums', labelKey: 'nav.forums' },
    ],
  },
  {
    titleKey: 'website.footer.helpAndLegal',
    links: [
      { to: '/help', labelKey: 'nav.help' },
      { to: '/legal/terms', labelKey: 'nav.terms' },
      { to: '/legal/guidelines', labelKey: 'nav.guidelines' },
      { to: '/contact', labelKey: 'nav.contactUs' },
      { to: '/report', labelKey: 'nav.reportContent' },
    ],
  },
];

/** One link: an in-page anchor stays a plain link, so the browser scrolls to it. */
function FooterColumnLink({ link }: { link: FooterLink }) {
  const { t } = useTranslation();
  const className = 'text-[15px] text-body no-underline hover:underline';
  if (link.to.startsWith('#')) {
    return (
      <a href={link.to} className={className}>
        {t(link.labelKey)}
      </a>
    );
  }
  return (
    <Link to={link.to} className={className}>
      {t(link.labelKey)}
    </Link>
  );
}

/**
 * Renders the columns.
 *
 * @param props.note - the few words about the site, or empty to leave them out
 * @param props.language - the note's language
 * @returns the footer's top part
 */
export function HomeFooterColumns({ note, language }: { note: string; language: string }) {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t('website.footer.label', { productName: brand.productName })}
      className="grid gap-10 border-t border-border pt-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]"
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 font-heading text-2xl font-extrabold text-heading">{brand.productName}</p>
        {note.trim() !== '' && (
          <p className="m-0 max-w-[360px] text-[15px] leading-relaxed text-body" lang={language}>
            {withBrand(note)}
          </p>
        )}
      </div>
      {footerColumns.map((column) => (
        <nav key={column.titleKey} aria-label={t(column.titleKey)} className="flex flex-col gap-3">
          <p className="m-0 eyebrow">{t(column.titleKey)}</p>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {column.links.map((link) => (
              <li key={link.to}>
                <FooterColumnLink link={link} />
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </section>
  );
}
