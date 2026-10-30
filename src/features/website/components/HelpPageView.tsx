/**
 * HelpPageView: /help/:slug, one help page (story S1-E11-12 criteria 8 and 9).
 *
 * The title is the page's one h1 and the body's headings start at h2 (CmsMarkdown). An address
 * with no live page says so plainly, with a link back to Help.
 * Who shows it: the router for "/help/:slug". What it calls: useWebsiteContent('help_page').
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';

import { CmsMarkdown } from './CmsMarkdown';

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
    <PageContainer className="flex max-w-[860px] flex-col gap-6 pt-10 pb-16">
      <Link to="/help" className="inline-flex min-h-6 items-center text-sm text-link underline">
        {t('website.help.back')}
      </Link>
      {page !== undefined && (
        <article lang={page.languageCode} className="flex flex-col gap-4">
          <title>{t('website.help.pageTitle', { title: withBrand(page.content.title) })}</title>
          <Eyebrow>{withBrand(page.content.section)}</Eyebrow>
          <h1 className="m-0 font-heading text-[40px] font-extrabold text-heading">
            {withBrand(page.content.title)}
          </h1>
          <CmsMarkdown markdown={page.content.body} language={page.languageCode} />
        </article>
      )}
      {page === undefined && readFailed && <Notice tone="error">{t('website.readFailed')}</Notice>}
      {page === undefined && isLoaded && !readFailed && (
        <>
          <h1 className="m-0 font-heading text-[32px] font-extrabold text-heading">
            {t('website.help.notFoundHeading')}
          </h1>
          <p className="m-0 text-body">{t('website.help.notFound')}</p>
        </>
      )}
    </PageContainer>
  );
}
