/**
 * NoticeStrip: the notice banner at the top of every page (story S1-E11-10).
 *
 * Which notice: the live notices for the visitor's market (with the fallbacks of
 * website_content()), those for every page plus, on "/", those for the home page; when several
 * fit, the one with the latest "show from" date (criterion 4). The text is in the visitor's
 * language from the notice's texts. Its colours come from the info-pill tokens per type, it is a
 * labelled region, it never moves focus and never animates (criterion 5). Closing it hides it for
 * this visit only, in session storage, so no consent is needed (criterion 6). Notices carry no
 * sponsor names or logos: text and one link to our own pages only.
 * Who shows it: AppLayout, above <main>. What it calls: useWebsiteContent('notice').
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { pathWithoutPlace } from '@/lib/websitePlace';
import { noticeContentSchema, type NoticeContent, type NoticeType } from '@/schemas/websiteContent';

import { useWebsiteContent, type ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';
import { isNoticeClosed, rememberNoticeClosed } from '../lib/closedNotices';

/** The pill colours per type: plum for news, gold for contests, blush for important. */
const toneClasses: Record<NoticeType, string> = {
  news: 'bg-(--pill-plum-bg) text-(--pill-plum-text) border-(--pill-plum-border)',
  contest: 'bg-(--pill-gold-bg) text-(--pill-gold-text) border-(--pill-gold-border)',
  important: 'bg-(--pill-blush-bg) text-(--pill-blush-text) border-(--pill-blush-border)',
};

/**
 * Picks the notice to show on this page.
 *
 * @param notices - the live notices
 * @param isHomePage - whether this is the home page ("/se/sv", LOCALISE-1)
 * @returns the latest one that fits, or undefined
 */
function noticeForPage(notices: ParsedEntry<NoticeContent>[], isHomePage: boolean) {
  const fitting = notices.filter((notice) => notice.content.showOn === 'all' || isHomePage);
  return fitting.sort((first, second) => second.showFrom.localeCompare(first.showFrom))[0];
}

/**
 * Renders the strip, or nothing.
 *
 * @returns the notice region or null
 */
export function NoticeStrip() {
  const { t } = useTranslation();
  const location = useLocation();
  const { entries } = useWebsiteContent('notice', noticeContentSchema);
  const [closedNow, setClosedNow] = useState<string | null>(null);
  const notice = noticeForPage(entries, pathWithoutPlace(location.pathname) === '/');
  if (notice === undefined) return null;
  const closeKey = `${notice.marketCode}:${notice.entryKey}:${notice.showFrom}`;
  if (closedNow === closeKey || isNoticeClosed(closeKey)) return null;
  const text = notice.content.texts[notice.languageCode] ?? '';
  if (text === '') return null;

  /** Hides the notice for the rest of this visit. */
  function close() {
    rememberNoticeClosed(closeKey);
    setClosedNow(closeKey);
  }

  return (
    <section
      aria-label={t('website.noticeLabel')}
      lang={notice.languageCode}
      className={`border-b ${toneClasses[notice.content.noticeType]}`}
    >
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-sm md:px-8">
        <p className="m-0 min-w-0 flex-1">{withBrand(text)}</p>
        {notice.content.link !== null && notice.content.link !== '' && (
          <Link
            to={notice.content.link}
            className="inline-flex min-h-6 items-center font-semibold underline"
          >
            {t('website.noticeMore')}
          </Link>
        )}
        <button
          type="button"
          onClick={close}
          aria-label={t('website.noticeClose')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
      </div>
    </section>
  );
}
