/**
 * WebsiteHomePage: the public home page at "/" (story S1-E5-08; board Website-Home, 1.1).
 *
 * What it shows, top to bottom: the hero with its cover wall (LOOK-2), "Why write here" with
 * the quiet safety row under it, the Trending and
 * Completed shelves and the questions marked for the home page. The hero, the cards, the safety
 * lines and the questions come only from the published CMS content for the visitor's market and
 * language (S1-E11-06, S1-E11-12; decided 17 Oct 2026, 19:14); the shelf titles and the top bar
 * are interface text from the locale files. The shelves are the shared Discover shelves, which
 * already keep to ratings, blocks and removed content (S1-E5-01) and end with "View more"
 * (S1-E5-09). The board's sample chapter, forums and apps bands wait for their features.
 * Who shows it: the router for "/". What it calls: useWebsiteContent for the home page and the
 * questions, and DiscoverShelf for the rows.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { DiscoverShelf } from '@/features/discovery/components/DiscoverShelf';
import type { ListRequest } from '@/features/discovery/api/storyLists';
import {
  homePageContentSchema,
  questionContentSchema,
  type HomePageContent,
  type QuestionContent,
} from '@/schemas/websiteContent';

import { useWebsiteContent, type ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';

import { HomeHero } from './HomeHero';
import { QuestionList } from './QuestionList';
import { homeQuestionsAnchor, SafetySection } from './SafetySection';
import { WhyWriteSection } from './WhyWriteSection';

/** A shelf's list, with no filters. */
function shelfRequest(kind: ListRequest['kind']): ListRequest {
  return {
    kind,
    key: null,
    categorySlug: null,
    completion: null,
    languageCode: null,
    sortOrder: null,
  };
}

/**
 * The two rows of stories.
 *
 * @returns the shelves
 */
function HomeShelves() {
  const { t } = useTranslation();
  return (
    <>
      <DiscoverShelf
        eyebrow={t('website.trendingEyebrow')}
        title={t('website.trending')}
        request={shelfRequest('popular')}
      />
      <DiscoverShelf
        eyebrow={t('website.completedEyebrow')}
        title={t('website.completed')}
        request={shelfRequest('completed')}
      />
    </>
  );
}

/**
 * The questions marked for the home page (S1-E11-12). The same cached request serves the safety
 * row's link and the questions section, so the browser asks once.
 *
 * @returns the questions, in their order; empty while loading or when none is marked
 */
function useHomeQuestions(): ParsedEntry<QuestionContent>[] {
  const { entries } = useWebsiteContent('question', questionContentSchema);
  return entries.filter((entry) => entry.content.showOn !== 'help');
}

/**
 * The questions shown on the home page, under the page's own heading.
 *
 * @returns the section, or nothing when no question is marked for the home page
 */
function HomeQuestions({
  page,
  questions,
}: {
  page: HomePageContent;
  questions: ParsedEntry<QuestionContent>[];
}) {
  if (questions.length === 0) return null;
  return (
    <section
      id={homeQuestionsAnchor}
      aria-labelledby="questions-heading"
      className="flex max-w-[860px] scroll-mt-6 flex-col gap-4"
    >
      <h2
        id="questions-heading"
        className="m-0 font-heading text-[clamp(28px,3vw,40px)] font-extrabold text-heading"
      >
        {withBrand(page.questionsHeading)}
      </h2>
      <QuestionList questions={questions} />
    </section>
  );
}

/**
 * The CMS sections, once the home page has arrived.
 *
 * @returns the hero and the sections around the shelves
 */
function HomeSections({ entry }: { entry: ParsedEntry<HomePageContent> }) {
  const { content: page, languageCode } = entry;
  const questions = useHomeQuestions();
  return (
    <>
      <HomeHero page={page} language={languageCode} />
      {/* "Why write here" and its quiet safety row sit close together, as on the board. */}
      <div className="flex flex-col gap-6">
        <WhyWriteSection page={page} language={languageCode} />
        <SafetySection page={page} language={languageCode} hasQuestions={questions.length > 0} />
      </div>
      <HomeShelves />
      <HomeQuestions page={page} questions={questions} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the page
 */
export function WebsiteHomePage() {
  const { t } = useTranslation();
  const { entries, readFailed } = useWebsiteContent('home_page', homePageContentSchema);
  const homePage = entries.find((entry) => entry.entryKey === 'home');
  return (
    <PageContainer className="tmc-rise flex flex-col gap-14 pt-12 pb-16">
      <title>{t('home.documentTitle')}</title>
      {homePage !== undefined && <HomeSections entry={homePage} />}
      {homePage === undefined && readFailed && (
        <>
          {/* No copy at all: say so plainly, and still show the stories. */}
          <h1 className="m-0 font-heading text-[40px] font-extrabold text-heading">
            {t('home.welcome')}
          </h1>
          <Notice tone="error">{t('website.readFailed')}</Notice>
          <HomeShelves />
        </>
      )}
    </PageContainer>
  );
}
