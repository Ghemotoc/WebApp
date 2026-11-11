/**
 * LandingPagesTab: Staff › Website › Landing pages, the list of pages and "New page", or one page
 * open in the editor (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * The open page is in the address (?page=<id>), so it survives a reload and Back closes it. Staff
 * with the landing pages area reach it (S1-E11-34); the database refuses everyone else anyway.
 * Who shows it: WebsiteAdminPage at /staff/website/landing-pages and LandingPagesAdminPage at
 * /staff/landing-pages. What it calls:
 * useLandingPageList, NewLandingPageForm and LandingPageEditor.
 */
import { Link, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { StaffLandingPage } from '../../api/landingPages';
import { useLandingPageList } from '../../hooks/useLandingPageEditor';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { LandingPageEditor } from './LandingPageEditor';
import { NewLandingPageForm } from './NewLandingPageForm';

/**
 * One page in the list: its address, type and state, and a link to edit it.
 *
 * @returns the list item
 */
function LandingPageRow({ page }: { page: StaffLandingPage }) {
  const { t } = useLandingPageTranslation();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-3">
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold break-words text-ink">/c/{page.slug}</span>
        <span className="text-sm text-meta">
          {t(`types.${page.pageType}`)}
          {page.isArchived ? ` · ${t('list.archived')}` : ''}
        </span>
      </span>
      <Link
        to={`?page=${page.id}`}
        aria-label={t('list.editLabel', { slug: page.slug })}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-link underline"
      >
        {t('list.edit')}
      </Link>
    </li>
  );
}

/**
 * Renders the tab.
 *
 * @returns the list or the editor
 */
export function LandingPagesTab() {
  const { t } = useLandingPageTranslation();
  const list = useLandingPageList();
  const [searchParams, setSearchParams] = useSearchParams();
  // Step 1: a page named in the address opens in the editor.
  const openId = searchParams.get('page');
  const openPage = list.pages.find((page) => page.id === openId);
  if (openPage !== undefined) {
    return (
      <LandingPageEditor key={openPage.id} page={openPage} onClose={() => setSearchParams({})} />
    );
  }
  // Step 2: otherwise the list and "New page".
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-[760px] text-body">{t('list.intro')}</p>
      <NewLandingPageForm list={list} onCreated={(pageId) => setSearchParams({ page: pageId })} />
      {list.loadFailure !== null && <Notice tone="error">{t('loadFailed')}</Notice>}
      {list.isLoading && <p className="m-0 text-meta">{t('loading')}</p>}
      {!list.isLoading && list.pages.length === 0 && list.loadFailure === null && (
        <p className="m-0 text-meta">{t('list.empty')}</p>
      )}
      {list.pages.length > 0 && (
        <section aria-labelledby="landing-list-heading" className="flex flex-col gap-2">
          <h2
            id="landing-list-heading"
            className="m-0 font-heading text-[20px] font-bold text-heading"
          >
            {t('list.heading')}
          </h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {list.pages.map((page) => (
              <LandingPageRow key={page.id} page={page} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
