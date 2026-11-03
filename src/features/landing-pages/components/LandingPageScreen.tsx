/**
 * LandingPageScreen: the public page at /c/<slug>, for contests and campaigns (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * It shows the live version in the visitor's interface language (Romanian or English; the page
 * is always written in both), "has ended" from the take-down date, and the app's own Not found
 * page when there is no page to show (none, archived or not live yet).
 * Who shows it: the router. What it calls: usePublicLandingPage and LandingPageView.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { NotFoundPage } from '@/app/shell/NotFoundPage';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { usePublicLandingPage } from '../hooks/usePublicLandingPage';
import { wordsOf } from '../lib/blocks';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { LandingPageView } from './LandingPageView';

/**
 * Renders the screen.
 *
 * @returns the page, a loading line, an error or Not found
 */
export function LandingPageScreen() {
  const { slug = '' } = useParams();
  const { i18n } = useTranslation();
  const { t } = useLandingPageTranslation();
  const page = usePublicLandingPage(slug);
  // Every page is written in Romanian and English; any other interface language reads English.
  const language = i18n.language.startsWith('ro') ? 'ro' : 'en';
  if (page.isError) {
    return (
      <PageContainer className="pt-12 pb-7">
        <Notice tone="error">{t('loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (page.data === undefined) {
    return (
      <PageContainer className="pt-12 pb-7">
        <p className="m-0 text-meta">{t('loading')}</p>
      </PageContainer>
    );
  }
  if (page.data === null) return <NotFoundPage />;
  const hero = page.data.content.blocks.find((block) => block.kind === 'hero');
  return (
    <PageContainer className="pt-8 pb-12">
      <title>{hero === undefined ? t('documentTitle') : wordsOf(hero, language, 'title')}</title>
      <LandingPageView
        content={page.data.content}
        language={language}
        hasEnded={page.data.state === 'ended'}
        pageType={page.data.type}
      />
    </PageContainer>
  );
}
