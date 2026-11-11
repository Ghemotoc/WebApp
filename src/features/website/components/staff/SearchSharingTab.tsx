/**
 * SearchSharingTab: Staff › Website › Search and sharing, one list of every public page with what
 * search engines and share cards show and what is missing (story S1-E11-39; bundle SEO-1d).
 *
 * Each page is one row: its address, its market and language, and how many warnings it has. Open
 * a row to see its warnings, its search result and its share card (SearchPagePreview). "Only pages
 * to fix" hides the pages with nothing missing. The words come from the same functions the real
 * tags use, so what staff see here is what search engines get. Fixing a page happens where it is
 * edited (Home page, Help and questions, Landing pages), in its Search and sharing box.
 * Who shows it: WebsiteAdminPage at /staff/website/search. What it calls: useSearchPages and
 * SearchPagePreview.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import { SearchPagesError } from '../../api/staff/searchPages';
import { useSearchPages } from '../../hooks/useSearchPages';
import type { SearchPageReport } from '../../lib/searchPageReport';

import { SearchPagePreview } from './SearchPagePreview';

/**
 * A page's place: its market and language, or its language alone for a landing page.
 *
 * @param page - the page
 * @returns the words, for example "RO · ro"
 */
function placeOf(page: SearchPageReport): string {
  return page.marketCode === null ? page.language : `${page.marketCode} · ${page.language}`;
}

/**
 * One page: a summary line that opens its preview.
 *
 * @returns a list item with a disclosure
 */
function PageRow({ page }: { page: SearchPageReport }) {
  const { t } = useTranslation('websiteAdmin');
  const count = page.warnings.length;
  return (
    <li className="border-b border-border last:border-b-0">
      <details className="group py-3">
        <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold break-all text-heading">{page.address}</span>
          <span className="text-sm text-meta">
            {t(`searchSharing.kinds.${page.kind}`)} · {placeOf(page)}
          </span>
          <InfoPill tone={count === 0 ? 'sage' : 'blush'}>
            {count === 0
              ? t('searchSharing.noWarnings')
              : t('searchSharing.warningCount', { count })}
          </InfoPill>
        </summary>
        <div className="pt-4">
          <SearchPagePreview page={page} />
        </div>
      </details>
    </li>
  );
}

/**
 * Renders the tab.
 *
 * @returns the intro, the filter and the list of pages
 */
export function SearchSharingTab() {
  const { t } = useTranslation('websiteAdmin');
  const pages = useSearchPages();
  const [onlyToFix, setOnlyToFix] = useState(false);
  // Step 1: loading and failures, in plain words.
  if (pages.isPending) return <p className="m-0 text-body">{t('loading')}</p>;
  if (pages.isError) {
    const failure = pages.error instanceof SearchPagesError ? pages.error.failure : 'unreachable';
    return <Notice tone="error">{t(`searchSharing.failures.${failure}`)}</Notice>;
  }
  // Step 2: the list, with or without the pages that have nothing missing.
  const shown = onlyToFix ? pages.data.filter((page) => page.warnings.length > 0) : pages.data;
  const toFix = pages.data.filter((page) => page.warnings.length > 0).length;
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="m-0 font-heading text-xl font-bold text-heading">
        {t('searchSharing.heading')}
      </h2>
      <p className="m-0 max-w-[760px] text-body">{t('searchSharing.intro')}</p>
      <p className="m-0 text-body" role="status">
        {t('searchSharing.summary', { count: pages.data.length, toFix })}
      </p>
      <label className="inline-flex min-h-6 items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={onlyToFix}
          onChange={(event) => setOnlyToFix(event.target.checked)}
        />
        {t('searchSharing.onlyToFix')}
      </label>
      {shown.length === 0 ? (
        <p className="m-0 text-body">{t('searchSharing.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((page) => (
            <PageRow key={`${page.address} ${placeOf(page)}`} page={page} />
          ))}
        </ul>
      )}
    </section>
  );
}
