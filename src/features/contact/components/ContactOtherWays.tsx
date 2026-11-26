/**
 * ContactOtherWays: "Other ways to reach us", the side column beside the Contact us form (G5b;
 * board J10 of the user stories, bundle 10).
 *
 * Three rows straight on the page, split by fine lines (no card since bundle 10): the contact
 * email (from the brand config, never typed into code; decided 17 Oct 2026, 12:47), Report
 * something and the Help centre. Each row is a link, at least 48 px tall, with a bold title and a
 * short line under it; the title underlines on hover and focus. The board's "Press and partners"
 * address isn't a brand setting yet, so it waits (G5b follow-up).
 * Who shows it: ContactPage. What it calls: react-router's Link.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { brand } from '@/config/brand';

/** Each row's look: the whole row is the link, at least 48 px tall (CLAUDE.md rule 9). */
const rowClass = 'group flex min-h-12 flex-col gap-1 py-3 text-ink no-underline';

/**
 * A row's words: the bold title and the short line under it.
 *
 * @returns the two lines
 */
function RowWords({ title, line }: { title: string; line: string }) {
  return (
    <>
      <span className="type-body font-semibold text-ink-heading group-hover:underline group-focus-visible:underline">
        {title}
      </span>
      <span className="type-body break-words text-ink-muted">{line}</span>
    </>
  );
}

/**
 * One row of the list, with the fine line under every row but the last.
 *
 * @returns the list item
 */
function Row({ children }: { children: ReactNode }) {
  return <li className="border-b border-hairline last:border-b-0">{children}</li>;
}

/**
 * Renders the side column under its own heading.
 *
 * @returns the aside
 */
export function ContactOtherWays() {
  const { t } = useTranslation('contact');
  return (
    <aside
      aria-labelledby="contact-other-ways"
      className="flex min-w-0 flex-[1_1_260px] flex-col gap-2 lg:max-w-[320px]"
    >
      <h2
        id="contact-other-ways"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('otherWays.heading')}
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        <Row>
          <a href={`mailto:${brand.contactEmail}`} className={rowClass}>
            <RowWords title={t('otherWays.emailTitle')} line={brand.contactEmail} />
          </a>
        </Row>
        <Row>
          <Link to="/report" className={rowClass}>
            <RowWords title={t('otherWays.reportTitle')} line={t('otherWays.reportLine')} />
          </Link>
        </Row>
        <Row>
          <Link to="/help" className={rowClass}>
            <RowWords title={t('otherWays.helpTitle')} line={t('otherWays.helpLine')} />
          </Link>
        </Row>
      </ul>
    </aside>
  );
}
