/**
 * Footer: the bottom of every member and public screen (story S1-E1-03; redrawn in NIGHT-2 from
 * the footer on every page of the design files, Robert, 23 Nov 2026).
 *
 * Design values: a 1 px hairline on top; a few words about the site (or, on a story's pages, the
 * story's sentence and blurb), then three columns of links (Read, Write and talk, Help and legal),
 * four across from 1024 px, two from 640 px and the words above two columns on phones; then
 * "An app by …", the Night mode button and the language drop-down, placed as each size draws them.
 * Headings are 15 px semibold, links 15 px at least 32 px tall with a 44 px row.
 * Decisions: the company name comes from the brand config ("An app by {{companyName}}", canvas
 * comment, 16 Oct 2026); the full Device / Light / Night choice stays in Settings › Appearance and
 * the staff footer; the end slot holds the language drop-down from S1-E1-04. Links are listed in
 * src/app/navigation.ts and appear only when their page exists.
 * Robert, 23 Nov 2026: the emblem alone sits above the words, aligned left and in the theme's
 * colour, and the company name links to the company's own site (brand.companySiteUrl).
 * Who uses it: AppLayout. What it calls: BrandEmblem, FooterLinkColumn and NightModeButton.
 */
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { type FooterColumn, footerColumns } from '@/app/navigation';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { BrandEmblem } from '@/features/branding/components/BrandMark';
import { NightModeButton } from '@/features/theme/components/NightModeButton';

/** What the footer needs. */
export interface FooterProps {
  /** The words in the first place; the site's own words when left out. */
  about?: ReactNode;
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
      <h2 className="m-0 font-body type-body leading-5 font-semibold text-ink-heading">
        {t(column.titleKey)}
      </h2>
      <ul className="mt-3 mb-0 flex list-none flex-col gap-1 p-0">
        {column.links.map((link) => (
          <li key={link.href}>
            {/* 32 px tall in a 44 px reach: the column's 2 px gaps add up to the touch target. */}
            <Link
              to={link.href}
              className="inline-flex min-h-8 items-center type-body text-ink no-underline hover:underline"
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
 * Renders the footer. One grid holds every part, so each screen size only moves the parts around
 * (the design files' footer at 1440, 768 and 390 px):
 * - phones: the words across the top, then two columns (Read and Write and talk, then Help and
 *   legal beside Night mode and the language), then "An app by …" at the bottom;
 * - from 640 px: two columns (the words beside Read, then Write and talk beside Help and legal),
 *   then a bottom row with "An app by …" on the left and the controls on the right;
 * - from 1024 px: the words and the three columns in one line of four, then the same bottom row.
 *
 * @param props.about - the words in the first place; the site's own words when left out
 * @param props.endSlot - extra controls after the Night mode button, such as the language drop-down
 * @returns the footer
 */
export function Footer({ about, endSlot }: FooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="mt-16">
      <PageContainer>
        {/* The top line spans the content column only, as in the design, not the side padding. */}
        <div className="border-t border-hairline pt-6 pb-8 sm:pt-8 lg:pt-8 lg:pb-12">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-8 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
            {/* Step 1: the emblem, then the words: the whole width on phones, the first column
                from 640 px. The emblem lines up with the words' left edge (Robert, 23 Nov 2026). */}
            <div className="col-span-2 flex min-w-0 flex-col items-start gap-4 sm:col-span-1">
              <BrandEmblem />
              {about ?? (
                <p className="m-0 max-w-[46ch] type-body leading-6 text-ink-muted">
                  {t('shell.footer.about')}
                </p>
              )}
            </div>
            {/* Step 2: the three columns of links. */}
            {footerColumns.map((column) => (
              <FooterLinkColumn key={column.titleKey} column={column} />
            ))}
            {/* Step 3: Night mode and the language: beside Help and legal on phones, at the right
                of the bottom row from 640 px (order-last puts it after "An app by …"). */}
            <div className="flex flex-col items-start gap-3 self-start sm:order-last sm:flex-row sm:flex-wrap sm:items-center sm:self-center sm:justify-self-end lg:col-span-2">
              <NightModeButton />
              {endSlot}
            </div>
            {/* Step 4: the maker's line: the last line on phones, the left of the bottom row after. */}
            <p className="col-span-2 m-0 self-center type-meta leading-[18px] text-ink-muted sm:col-span-1 lg:col-span-2">
              {/* The company name opens the company's site in this tab (Robert, 23 Nov 2026). */}
              <Trans
                i18nKey="shell.madeBy"
                components={{
                  company: (
                    // Trans puts the translated name inside; the brand name here is only its stand-in.
                    <a
                      href={brand.companySiteUrl}
                      className="text-ink-muted underline hover:text-ink"
                    >
                      {brand.companyName}
                    </a>
                  ),
                }}
              />
            </p>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
