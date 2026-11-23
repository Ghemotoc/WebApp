/**
 * Footer: the bottom of every member and public screen (story S1-E1-03; redrawn in NIGHT-2 from
 * the footer on every page of the design files, Robert, 23 Nov 2026).
 *
 * Design values: a 1 px top line; a few words about the site, then three columns of links (Read,
 * Write and talk, Help and legal), four across from 1024 px, the words above two columns on
 * smaller screens; then a row with "An app by …", the Night mode button and the language
 * drop-down. Headings are 15 px semibold, links 15 px at least 32 px tall with a 44 px row.
 * Decisions: the company name comes from the brand config ("An app by {{companyName}}", canvas
 * comment, 16 Oct 2026); the full Device / Light / Night choice stays in Settings › Appearance and
 * the staff footer; the end slot holds the language drop-down from S1-E1-04. Links are listed in
 * src/app/navigation.ts and appear only when their page exists.
 * Who uses it: AppLayout. What it calls: FooterLinkColumn and NightModeButton.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { type FooterColumn, footerColumns } from '@/app/navigation';
import { PageContainer } from '@/components/ui/PageContainer';
import { NightModeButton } from '@/features/theme/components/NightModeButton';

/** What the footer needs. */
export interface FooterProps {
  /** Extra controls after the Night mode button, such as the language drop-down. */
  endSlot?: ReactNode;
}

/**
 * One column: its heading and its links, each a named navigation landmark.
 *
 * @param props.column - the column's heading key and links
 * @returns the column
 */
function FooterLinkColumn({ column }: { column: FooterColumn }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t(column.titleKey)}>
      <h2 className="m-0 text-[15px] leading-5 font-semibold text-heading">{t(column.titleKey)}</h2>
      <ul className="mt-2.5 mb-0 flex list-none flex-col gap-0.5 p-0">
        {column.links.map((link) => (
          <li key={link.href}>
            {/* 32 px tall in a 44 px reach: the column's 2 px gaps add up to the touch target. */}
            <Link
              to={link.href}
              className="inline-flex min-h-8 items-center text-[15px] text-ink no-underline hover:underline"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Renders the footer.
 *
 * @returns the footer
 */
export function Footer({ endSlot }: FooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="mt-18">
      <PageContainer>
        {/* The top line spans the content column only, as in the design, not the side padding. */}
        <div className="border-t border-border pt-7 pb-10 lg:pt-10 lg:pb-12">
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] lg:gap-8">
            <p className="col-span-2 m-0 max-w-[46ch] text-[15px] leading-6 text-body lg:col-span-1">
              {t('shell.footer.about')}
            </p>
            {footerColumns.map((column) => (
              <FooterLinkColumn key={column.titleKey} column={column} />
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 lg:mt-8">
            <p className="m-0 text-[13px] leading-[18px] text-meta">{t('shell.madeBy')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <NightModeButton />
              {endSlot}
            </div>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
