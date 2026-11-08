/**
 * ContactOtherWays: "Other ways to reach us", the side card beside the Contact us form (G5b;
 * board Contact).
 *
 * Three rows in one glass card: the contact email (from the brand config, never typed into code;
 * decided 17 Oct 2026, 12:47), Report something and the Help centre. Each row is a link with a
 * bold title and a short line under it. The board's "Press and partners" address isn't a brand
 * setting yet, so it waits (G5b follow-up).
 * Who shows it: ContactPage. What it calls: react-router's Link.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { brand } from '@/config/brand';

/** Each row's look: the whole row is the link, at least 64 px tall. */
const rowClass = 'flex min-h-16 items-center gap-4 px-5 py-4 text-ink no-underline hover:bg-tint';

/**
 * A row's words: the bold title and the short line under it.
 *
 * @returns the two lines
 */
function RowWords({ title, line }: { title: string; line: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="font-semibold text-heading">{title}</span>
      <span className="text-sm break-words text-meta">{line}</span>
    </span>
  );
}

/**
 * Renders the card under its own heading.
 *
 * @returns the aside
 */
export function ContactOtherWays() {
  const { t } = useTranslation('contact');
  return (
    <aside aria-labelledby="contact-other-ways" className="flex flex-col gap-3">
      <h2 id="contact-other-ways" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('otherWays.heading')}
      </h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card">
        <li className="border-b border-hairline">
          <a href={`mailto:${brand.contactEmail}`} className={rowClass}>
            <RowWords title={t('otherWays.emailTitle')} line={brand.contactEmail} />
          </a>
        </li>
        <li className="border-b border-hairline">
          <Link to="/report" className={rowClass}>
            <RowWords title={t('otherWays.reportTitle')} line={t('otherWays.reportLine')} />
            <ChevronRightIcon className="shrink-0 text-meta" />
          </Link>
        </li>
        <li>
          <Link to="/help" className={rowClass}>
            <RowWords title={t('otherWays.helpTitle')} line={t('otherWays.helpLine')} />
            <ChevronRightIcon className="shrink-0 text-meta" />
          </Link>
        </li>
      </ul>
    </aside>
  );
}
