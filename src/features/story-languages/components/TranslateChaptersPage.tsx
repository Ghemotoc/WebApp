/**
 * TranslateChaptersPage: one language of a story, for its writer: "Translation · English"
 * (bundle TRANSLATE-1c; Robert, 16 Nov 2026).
 *
 * Who shows it: the router, at /write/s/:storySlug/translate, where the address is that
 * language's own. "Translate" in the Languages table leads here.
 * What it shows: the breadcrumb (Write / story / Languages / language), the language's title,
 * the chapters of the original with where each translation stands (TranslationChapterList), the
 * title and description in this language (EditionDetailsForm) and "Remove this language"
 * (RemoveLanguageCard). Opened with the original's address it says so and links to Languages.
 * What it calls: hooks/useStoryLanguages.ts and hooks/useTranslationChapters.ts.
 * No doodles: this is a settings screen made of plain cards.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { languageOwnName } from '@/lib/language-names';

import type { StoryLanguage, StoryLanguages } from '../api/storyLanguages';
import { useStoryLanguages } from '../hooks/useStoryLanguages';
import { useTranslationChapters } from '../hooks/useTranslationChapters';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

import { EditionDetailsForm } from './EditionDetailsForm';
import { LanguagesBreadcrumb } from './LanguagesBreadcrumb';
import { LoadProblem } from './LoadProblem';
import { RemoveLanguageCard } from './RemoveLanguageCard';
import { TranslationChapterList } from './TranslationChapterList';

/** What the body needs: the story's languages and the one this page is about. */
interface EditionBodyProps {
  languages: StoryLanguages;
  edition: StoryLanguage;
}

/** The heading of a language's page: eyebrow, title in that language, intro, link to its page. */
function EditionHeader({ edition }: { edition: StoryLanguage }) {
  const { t } = useStoryLanguagesTranslation();
  const language = languageOwnName(edition.languageCode);
  return (
    <header className="flex max-w-[760px] flex-col gap-2">
      <Eyebrow>{t('chapters.eyebrow', { language })}</Eyebrow>
      <h1 lang={edition.languageCode} className="m-0 type-title lg:type-display break-words">
        {edition.title}
      </h1>
      <p className="m-0 type-long leading-relaxed text-ink-muted">{t('chapters.intro')}</p>
      {edition.isPublic && (
        <Link
          to={`/s/${edition.slug}`}
          className="inline-flex min-h-11 items-center self-start type-body font-semibold"
        >
          {t('chapters.seePage')}
        </Link>
      )}
    </header>
  );
}

/** The chapters, with the details form and the removal beside them on a wide screen. */
function EditionBody({ languages, edition }: EditionBodyProps) {
  const list = useTranslationChapters(edition.slug);
  const original = languages.editions[0];
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 lg:flex-[999_1_520px] flex-col gap-6">
        <TranslationChapterList
          list={list}
          originalLanguageCode={original?.languageCode ?? edition.languageCode}
        />
      </div>
      <div className="flex w-full lg:flex-[1_1_320px] flex-col gap-6 lg:max-w-[400px]">
        {/* The key starts the form again with the saved words when another language opens. */}
        <EditionDetailsForm key={edition.slug} edition={edition} />
        <RemoveLanguageCard
          editionSlug={edition.slug}
          firstEditionSlug={languages.firstEditionSlug}
          language={languageOwnName(edition.languageCode)}
        />
      </div>
    </div>
  );
}

/** The page once the languages are known: this language's screen, or why not. */
function EditionState({ languages, storySlug }: { languages: StoryLanguages; storySlug: string }) {
  const { t } = useStoryLanguagesTranslation();
  const original = languages.editions[0];
  const edition = languages.editions.find((candidate) => candidate.slug === storySlug);
  if (original === undefined || edition === undefined) {
    return <Notice tone="error">{t('page.notFound')}</Notice>;
  }
  // The original has nothing to translate: point to the Languages page instead.
  if (edition.isFirstEdition) {
    return (
      <>
        <LanguagesBreadcrumb story={original} />
        <p className="m-0 text-ink-muted">{t('chapters.notAnEdition')}</p>
        <Link
          to={`/write/s/${original.slug}/languages`}
          className="inline-flex min-h-11 items-center self-start font-semibold"
        >
          {t('chapters.backToLanguages')}
        </Link>
      </>
    );
  }
  return (
    <>
      <title>{t('chapters.documentTitle', { story: edition.title })}</title>
      <LanguagesBreadcrumb story={original} languageName={languageOwnName(edition.languageCode)} />
      <EditionHeader edition={edition} />
      <EditionBody languages={languages} edition={edition} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the language's screen, a wait, or a plain message
 */
export function TranslateChaptersPage() {
  const { storySlug = '' } = useParams();
  const state = useStoryLanguages(storySlug);
  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-8 pb-6">
      <LoadProblem {...state} isMissing={state.languages === null} kind="story" />
      {state.languages !== null && (
        <EditionState languages={state.languages} storySlug={storySlug} />
      )}
    </PageContainer>
  );
}
