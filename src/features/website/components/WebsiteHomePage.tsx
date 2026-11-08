/**
 * WebsiteHomePage: the public home page at "/" (story S1-E5-08; board Website-Home, 1.1).
 *
 * What it shows, top to bottom, in the board's order: the hero with its cover wall (LOOK-2),
 * "Why write here" with the quiet safety row, Trending this week with genre chips, Completed
 * stories and New and rising writers (HomeShelves), the dark writers' band, the forums band, the
 * gold "Start your first story" band, "Apps come later", the questions in two columns (one open at
 * a time, with FAQPage data for search engines and "Something else?" links; G5b) and the big
 * footer (LOOK-3). Every word of the page comes only from the published CMS content for the
 * visitor's market and language (S1-E11-06, S1-E11-12; decided 17 Oct 2026, 19:14); a band whose
 * heading is empty is left out. Shelf titles, the footer's columns and the top bar are interface
 * text from the locale files. The shelves keep to ratings, blocks and removed content
 * (S1-E5-01) and end with "View more" (S1-E5-09).
 * Who shows it: the router for "/". What it calls: useWebsiteContent for the home page and the
 * questions, HomeShelves, the four bands and HomeFooterColumns.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  homePageContentSchema,
  questionContentSchema,
  type HomePageContent,
  type QuestionContent,
} from '@/schemas/websiteContent';

import { useWebsiteContent, type ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';
import { hasBand } from '../lib/homeBands';

import { AppsBand } from './AppsBand';
import { CommunityBand } from './CommunityBand';
import { FirstStoryBand } from './FirstStoryBand';
import { HomeFooterColumns } from './HomeFooterColumns';
import { HomeHero } from './HomeHero';
import { HomeShelves } from './HomeShelves';
import { QuestionList } from './QuestionList';
import { QuestionsStructuredData } from './QuestionsStructuredData';
import { homeQuestionsAnchor, SafetySection } from './SafetySection';
import { WhyWriteSection } from './WhyWriteSection';
import { WriteBand } from './WriteBand';

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

/** Where "Something else?" points, under the questions heading (board Website-Home). */
const moreHelpLinks = [
  { href: '/contact', labelKey: 'website.moreHelp.contact' },
  { href: '/legal/guidelines', labelKey: 'website.moreHelp.guidelines' },
  { href: '/report', labelKey: 'website.moreHelp.report' },
] as const;

/**
 * "Something else?" and three links, under the questions heading. They are navigation, like the
 * footer, so their words are interface text rather than CMS text (G5b).
 *
 * @returns the lead line and the links
 */
function MoreHelpLinks() {
  const { t } = useTranslation();
  return (
    <nav aria-labelledby="more-help-lead" className="flex flex-col gap-1">
      <p id="more-help-lead" className="m-0 text-body">
        {t('website.moreHelp.lead')}
      </p>
      <ul className="m-0 flex list-none flex-col p-0">
        {moreHelpLinks.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="inline-flex min-h-11 items-center font-semibold text-heading underline-offset-4 hover:underline"
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
  const { t } = useTranslation();
  if (questions.length === 0) return null;
  return (
    <section
      id={homeQuestionsAnchor}
      aria-labelledby="questions-heading"
      className="grid scroll-mt-6 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12"
    >
      {/* The heading and "Something else?" on one side, the questions on the other (board). */}
      <div className="flex flex-col gap-4">
        <Eyebrow>{t('website.questionsEyebrow')}</Eyebrow>
        <h2
          id="questions-heading"
          className="m-0 font-heading text-[clamp(28px,3vw,40px)] font-extrabold text-heading"
        >
          {withBrand(page.questionsHeading)}
        </h2>
        <MoreHelpLinks />
      </div>
      <QuestionList questions={questions} groupName="home-questions" />
      <QuestionsStructuredData questions={questions} />
    </section>
  );
}

/**
 * The four bands lower down, each only when staff gave it a heading (LOOK-3).
 *
 * @returns the bands
 */
function HomeBands({ page, language }: { page: HomePageContent; language: string }) {
  return (
    <>
      {hasBand(page.writeBand) && <WriteBand band={page.writeBand} language={language} />}
      {hasBand(page.communityBand) && (
        <CommunityBand band={page.communityBand} language={language} />
      )}
      {hasBand(page.firstStoryBand) && (
        <FirstStoryBand band={page.firstStoryBand} language={language} />
      )}
      {hasBand(page.appsBand) && <AppsBand band={page.appsBand} language={language} />}
    </>
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
      <HomeBands page={page} language={languageCode} />
      <HomeQuestions page={page} questions={questions} />
      <HomeFooterColumns note={page.footerNote ?? ''} language={languageCode} />
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
