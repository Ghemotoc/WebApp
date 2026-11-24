/**
 * StoryLanguagesPage: "Languages · The original and every translation of this story." (bundle
 * TRANSLATE-1c; board TrSettings; Robert, 16 Nov 2026).
 *
 * Who shows it: the router, at /write/s/:storySlug/languages; "Languages" in Story settings
 * leads here.
 * What it shows: the breadcrumb, the heading, the table of languages (LanguagesTable), the "Add a
 * language" form (AddLanguageForm) and, beside them on a wide screen, the card "One story, many
 * languages". Opened with a translation's address, it shows the same story's languages.
 * What it calls: hooks/useStoryLanguages.ts → story_languages().
 * No doodles: this is a settings screen made of plain cards.
 */
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { useParams } from 'react-router';

import type { StoryLanguages } from '../api/storyLanguages';
import { useStoryLanguages } from '../hooks/useStoryLanguages';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

import { AddLanguageForm } from './AddLanguageForm';
import { LanguagesBreadcrumb } from './LanguagesBreadcrumb';
import { LoadProblem } from './LoadProblem';
import { LanguagesTable } from './LanguagesTable';

/** The card beside the table: what "one story, many languages" means. */
function ManyLanguagesCard() {
  const { t } = useStoryLanguagesTranslation();
  return (
    <aside className="flex w-full md:flex-[1_1_280px] flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card md:max-w-[340px]">
      <h2 className="m-0 font-heading type-long font-bold text-ink-heading">{t('side.heading')}</h2>
      <p className="m-0 type-body leading-relaxed text-ink-muted">{t('side.body')}</p>
    </aside>
  );
}

/** The table and the form, with the card beside them. */
function LanguagesBody({ languages }: { languages: StoryLanguages }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="flex min-w-0 md:flex-[999_1_520px] flex-col gap-6">
        <LanguagesTable languages={languages.editions} />
        <AddLanguageForm storySlug={languages.firstEditionSlug} languages={languages} />
      </div>
      <ManyLanguagesCard />
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Languages screen, a wait, or a plain message
 */
export function StoryLanguagesPage() {
  const { t } = useStoryLanguagesTranslation();
  const { storySlug = '' } = useParams();
  const state = useStoryLanguages(storySlug);
  // The original is the first row; its title names the story in the breadcrumb and the tab.
  const original = state.languages?.editions[0];
  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-8 pb-6">
      <title>{t('page.documentTitle', { story: original?.title ?? '' })}</title>
      {original !== undefined && <LanguagesBreadcrumb story={original} />}
      <header className="flex max-w-[760px] flex-col gap-2">
        <Eyebrow>{t('page.eyebrow')}</Eyebrow>
        <h1 className="m-0 type-title lg:type-display">{t('page.heading')}</h1>
        <p className="m-0 type-long leading-relaxed text-ink-muted">{t('page.intro')}</p>
      </header>
      <LoadProblem {...state} isMissing={state.languages === null} kind="story" />
      {state.languages !== null && <LanguagesBody languages={state.languages} />}
    </PageContainer>
  );
}
