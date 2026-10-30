/**
 * HelpCentrePage: /help, the help pages by section and the questions marked for Help (story
 * S1-E11-12 criteria 2, 8 and 9).
 *
 * The pages and questions are the published CMS content for the visitor's market and language;
 * the page's own title and labels are interface text. One h1, real headings, the content's `lang`.
 * Who shows it: the router for "/help". What it calls: useWebsiteContent for help pages and
 * questions, and QuestionList.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  helpPageContentSchema,
  questionContentSchema,
  type HelpPageContent,
} from '@/schemas/websiteContent';

import { useWebsiteContent, type ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';

import { QuestionList } from './QuestionList';

/**
 * Groups the pages by their section, keeping the sections in the order they first appear.
 *
 * @param pages - the live help pages
 * @returns [section, pages] pairs
 */
function pagesBySection(
  pages: ParsedEntry<HelpPageContent>[],
): [string, ParsedEntry<HelpPageContent>[]][] {
  const sections = new Map<string, ParsedEntry<HelpPageContent>[]>();
  for (const page of pages) {
    const section = page.content.section;
    sections.set(section, [...(sections.get(section) ?? []), page]);
  }
  return [...sections.entries()];
}

/**
 * The help pages, under their section headings.
 *
 * @returns the sections
 */
function HelpSections({ pages }: { pages: ParsedEntry<HelpPageContent>[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {pagesBySection(pages).map(([section, sectionPages]) => (
        <section key={section} className="flex flex-col gap-2" lang={sectionPages[0]?.languageCode}>
          <h2 className="m-0 font-heading text-[22px] font-bold text-heading">
            {withBrand(section)}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {sectionPages.map((page) => (
              <li key={page.entryKey}>
                <Link
                  to={`/help/${page.entryKey}`}
                  className="inline-flex min-h-6 items-center text-link underline"
                >
                  {withBrand(page.content.title)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the help centre
 */
export function HelpCentrePage() {
  const { t } = useTranslation();
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  const questions = useWebsiteContent('question', questionContentSchema);
  const helpQuestions = questions.entries.filter((entry) => entry.content.showOn !== 'home');
  return (
    <PageContainer className="flex flex-col gap-8 pt-10 pb-16">
      <title>{t('website.help.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('website.help.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[40px] font-extrabold text-heading">
          {t('website.help.heading')}
        </h1>
        <p className="m-0 text-body">{t('website.help.intro')}</p>
      </div>
      {(pages.readFailed || questions.readFailed) && (
        <Notice tone="error">{t('website.readFailed')}</Notice>
      )}
      <HelpSections pages={pages.entries} />
      {helpQuestions.length > 0 && (
        <section aria-labelledby="help-questions" className="flex max-w-[860px] flex-col gap-3">
          <h2
            id="help-questions"
            className="m-0 font-heading text-[28px] font-extrabold text-heading"
          >
            {t('website.help.questions')}
          </h2>
          <QuestionList questions={helpQuestions} />
        </section>
      )}
    </PageContainer>
  );
}
