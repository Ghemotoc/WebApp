/**
 * HelpPageView: /help/:slug, one help page (story S1-E11-12 criteria 8 and 9; the glass look in
 * G5b, board HelpArticle).
 *
 * A breadcrumb (Help / section / title) sits above one glass card holding the page: its title is
 * the page's one h1, a quiet line says when this version went live and how long it takes to read,
 * and the body's headings start at h2 (CmsMarkdown). An address with no live page says so plainly,
 * with a link back to Help.
 * Who shows it: the router for "/help/:slug". What it calls: useWebsiteContent('help_page'),
 * readingMinutes and formatRomaniaDate.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { HelpPageContent } from '@/schemas/websiteContent';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { useWebsiteContent, type ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';
import { readingMinutes } from '../lib/cmsPlainText';
import { WebsiteLink } from './WebsiteLink';

import { CmsMarkdown } from './CmsMarkdown';

/** The breadcrumb links' look: underlined, with room for a finger. */
const crumbLinkClass = 'inline-flex min-h-6 items-center text-link underline underline-offset-3';

/**
 * Help / section / title. The section has no page of its own, so it links to Help too, as on the
 * board; the last crumb is the current page and isn't a link.
 *
 * @param props.title - the page title, brand filled
 * @param props.section - the page's section, brand filled
 * @returns the breadcrumb navigation
 */
function HelpBreadcrumb({ title, section }: { title: string; section: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('website.help.breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-sm">
        <li>
          <WebsiteLink to="/help" className={crumbLinkClass}>
            {t('website.help.eyebrow')}
          </WebsiteLink>
        </li>
        <li aria-hidden="true" className="text-meta">
          /
        </li>
        <li>
          <WebsiteLink to="/help" className={crumbLinkClass}>
            {section}
          </WebsiteLink>
        </li>
        <li aria-hidden="true" className="text-meta">
          /
        </li>
        <li aria-current="page" className="text-meta">
          {title}
        </li>
      </ol>
    </nav>
  );
}

/**
 * The page itself in its glass card.
 *
 * @param props.page - the live help page
 * @returns the article
 */
function HelpArticle({ page }: { page: ParsedEntry<HelpPageContent> }) {
  const { t, i18n } = useTranslation();
  const title = withBrand(page.content.title);
  // "Updated 4 November 2026 · 3 min read": the date this version went live (its "show from").
  const updated = formatRomaniaDate(new Date(page.showFrom), i18n.language);
  const minutes = readingMinutes(page.content.body);
  return (
    <>
      {/* The search title when staff gave one (S1-E11-37), as server/website-head.ts writes it. */}
      <title>{t('shell.pageTitle', { title: page.content.search?.title.trim() || title })}</title>
      <HelpBreadcrumb title={title} section={withBrand(page.content.section)} />
      <article
        lang={page.languageCode}
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card sm:p-10 lg:px-14 lg:py-12"
      >
        <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] font-extrabold text-heading">
          {title}
        </h1>
        <p className="m-0 text-sm text-meta" lang={i18n.language}>
          {t('website.help.updatedLine', { date: updated, count: minutes })}
        </p>
        <div className="mt-3 max-w-[720px] text-[17px] leading-[1.7]">
          <CmsMarkdown markdown={page.content.body} language={page.languageCode} />
        </div>
      </article>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the help page, a "not found" notice, or nothing while it loads
 */
export function HelpPageView() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { entries, isLoaded, readFailed } = useWebsiteContent('help_page', helpPageContentSchema);
  const page = entries.find((entry) => entry.entryKey === slug);
  return (
    <PageContainer className="flex max-w-[960px] flex-col gap-5 pt-10 pb-16">
      {page !== undefined && <HelpArticle page={page} />}
      {page === undefined && readFailed && <Notice tone="error">{t('website.readFailed')}</Notice>}
      {page === undefined && isLoaded && !readFailed && (
        <>
          <h1 className="m-0 font-heading text-[32px] font-extrabold text-heading">
            {t('website.help.notFoundHeading')}
          </h1>
          <p className="m-0 text-body">{t('website.help.notFound')}</p>
          <WebsiteLink
            to="/help"
            className="inline-flex min-h-6 w-fit items-center text-link underline"
          >
            {t('website.help.back')}
          </WebsiteLink>
        </>
      )}
    </PageContainer>
  );
}
