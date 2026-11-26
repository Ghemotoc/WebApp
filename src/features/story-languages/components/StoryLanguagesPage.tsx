/**
 * StoryLanguagesPage: "Languages · The original and every translation of this story." (bundle
 * TRANSLATE-1c; Robert, 16 Nov 2026), as board D08 draws it (CALM-9, user story 5.8).
 *
 * Who shows it: the router, at /write/s/:storySlug/languages; "Languages" in Story settings
 * leads here.
 * What it shows, in one column as the board has it: the breadcrumb and the heading, the table of
 * languages (LanguagesTable), the "Add a language" group (AddLanguageForm) and, last, the card
 * "One story, many languages". Opened with a translation's address, it shows the same story's
 * languages.
 * What it calls: hooks/useStoryLanguages.ts → story_languages().
 * No doodles: a settings screen made of a plain table, a form and one card.
 */
import { PageContainer } from '@/components/ui/PageContainer';
import { useParams } from 'react-router';

import type { StoryLanguages } from '../api/storyLanguages';
import { useStoryLanguages } from '../hooks/useStoryLanguages';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

import { AddLanguageForm } from './AddLanguageForm';
import { LanguagesBreadcrumb } from './LanguagesBreadcrumb';
import { LoadProblem } from './LoadProblem';
import { LanguagesTable } from './LanguagesTable';

/** The card at the foot of the page: what "one story, many languages" means. */
function ManyLanguagesCard() {
  const { t } = useStoryLanguagesTranslation();
  return (
    <aside className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6">
      <h2 className="m-0 font-heading type-subheading font-bold text-ink-heading">
        {t('side.heading')}
      </h2>
      <p className="m-0 type-body text-ink">{t('side.body')}</p>
    </aside>
  );
}

/** The table, the form and the card, one under another (board D08). */
function LanguagesBody({ languages }: { languages: StoryLanguages }) {
  return (
    <>
      <LanguagesTable languages={languages.editions} />
      <AddLanguageForm storySlug={languages.firstEditionSlug} languages={languages} />
      <ManyLanguagesCard />
    </>
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
    // Board D08's spacing: 32 px between the parts on a phone, 48 on a tablet, 64 on a computer.
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-6 pb-12 md:gap-12 lg:gap-16 lg:pt-12 lg:pb-20">
      <title>{t('page.documentTitle', { story: original?.title ?? '' })}</title>
      <div className="flex flex-col gap-3">
        {original !== undefined && <LanguagesBreadcrumb story={original} />}
        <header className="flex flex-col gap-2">
          <h1 className="m-0 type-title lg:type-display">{t('page.heading')}</h1>
          <p className="m-0 type-body text-ink-muted">{t('page.intro')}</p>
        </header>
      </div>
      <LoadProblem {...state} isMissing={state.languages === null} kind="story" />
      {state.languages !== null && <LanguagesBody languages={state.languages} />}
    </PageContainer>
  );
}
