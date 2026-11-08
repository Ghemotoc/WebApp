/**
 * HelpCentrePage: /help, the help pages by section and the questions marked for Help (story
 * S1-E11-12 criteria 2, 8 and 9; the glass look in G5b, board Help).
 *
 * Top to bottom, as on the board: a centred heading with a search field, the sections as glass
 * tiles, then Popular questions beside "Still stuck?". The search narrows the tiles and the
 * questions in the browser as the visitor types (helpSearch); a line read by screen readers says
 * how many match. The pages and questions are the published CMS content for the visitor's market
 * and language; the page's own title, labels and the "Still stuck?" links are interface text. One
 * h1, real headings, the content's `lang`. The questions carry FAQPage data for search engines.
 * Who shows it: the router for "/help". What it calls: useWebsiteContent for help pages and
 * questions, matchingHelpPages and matchingQuestions, HelpTopicTiles, QuestionList,
 * QuestionsStructuredData and HelpStillStuck.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  helpPageContentSchema,
  questionContentSchema,
  type QuestionContent,
} from '@/schemas/websiteContent';

import { useWebsiteContent, type ParsedEntry } from '../hooks/useWebsiteContent';
import { matchingHelpPages, matchingQuestions } from '../lib/helpSearch';

import { HelpStillStuck } from './HelpStillStuck';
import { HelpTopicTiles } from './HelpTopicTiles';
import { QuestionList } from './QuestionList';
import { QuestionsStructuredData } from './QuestionsStructuredData';

/**
 * The centred heading and the search field.
 *
 * @param props.query - what is typed in the field
 * @param props.onQueryChange - called with the new words as the visitor types
 * @returns the page header
 */
function HelpHeader({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <Eyebrow>{t('website.help.eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] font-extrabold text-heading">
        {t('website.help.heading')}
      </h1>
      <p className="m-0 max-w-[620px] text-body">{t('website.help.intro')}</p>
      {/* role="search" names the landmark; the results change as the visitor types, so the form
          is never sent anywhere. */}
      <form
        role="search"
        className="mt-3 w-full max-w-[720px] text-left"
        onSubmit={(event) => event.preventDefault()}
      >
        <SearchInput
          id="help-search"
          label={t('website.help.searchLabel')}
          placeholder={t('website.help.searchPlaceholder')}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </form>
    </header>
  );
}

/**
 * Popular questions, in one glass card, with their FAQPage data.
 *
 * @param props.questions - the questions left after the search
 * @returns the section, or nothing when no question is left
 */
function PopularQuestions({ questions }: { questions: ParsedEntry<QuestionContent>[] }) {
  const { t } = useTranslation();
  if (questions.length === 0) return null;
  return (
    <section aria-labelledby="help-questions" className="flex min-w-0 flex-col gap-3">
      <h2 id="help-questions" className="m-0 font-heading text-[28px] font-extrabold text-heading">
        {t('website.help.questions')}
      </h2>
      <div className="rounded-card border border-border bg-surface px-5 shadow-card [&_li:last-child]:border-b-0">
        <QuestionList questions={questions} groupName="help-questions" />
      </div>
      <QuestionsStructuredData questions={questions} />
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the help centre
 */
export function HelpCentrePage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  const questions = useWebsiteContent('question', questionContentSchema);
  // A country's own legal section ("legal-your-country", MARKETS-1) shows under the privacy
  // notice and the terms, not in the Help list.
  const helpPages = pages.entries.filter((page) => !page.entryKey.startsWith('legal-'));
  const helpQuestions = questions.entries.filter((entry) => entry.content.showOn !== 'home');
  // Step 1: narrow both lists to what matches the search (everything while it is blank).
  const shownPages = matchingHelpPages(helpPages, query);
  const shownQuestions = matchingQuestions(helpQuestions, query);
  const isSearching = query.trim() !== '';
  const matchCount = shownPages.length + shownQuestions.length;
  return (
    <PageContainer className="flex flex-col gap-10 pt-10 pb-16">
      <title>{t('website.help.documentTitle')}</title>
      <HelpHeader query={query} onQueryChange={setQuery} />
      {(pages.readFailed || questions.readFailed) && (
        <Notice tone="error">{t('website.readFailed')}</Notice>
      )}
      {/* Step 2: say how many match, for screen readers and, when nothing does, for everyone. */}
      <p
        role="status"
        className={isSearching && matchCount === 0 ? 'm-0 text-center text-body' : 'sr-only'}
      >
        {isSearching ? t('website.help.searchResults', { count: matchCount }) : ''}
      </p>
      <HelpTopicTiles pages={shownPages} />
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <PopularQuestions questions={shownQuestions} />
        <HelpStillStuck />
      </div>
    </PageContainer>
  );
}
