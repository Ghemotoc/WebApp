/**
 * StorySettingsPage: a story's settings, board 4.2 in edit mode plus "The whole story" from
 * board 4.4 (story S1-E3-05).
 *
 * Who shows it: the router, at /write/s/:storySlug/settings; the "Story settings" button on
 * Your writing leads here.
 * What it shows: the story's title as the heading, then the same sections as the new story form
 * (the basics, category and tags, the cover, with the current values), "Status and comments",
 * the save bar, and the delete card. The "Labels" section joins with S1-E3-06 and the chapters
 * with S1-E3-03. The writer can go back to the automatic cover from here (S1-E3-13), and pick the
 * rank badges the cover shows (CMS-1g, RankBadgePicker). A student shares the story only with
 * their class, or makes it public again (StoryClassCard, bundle CLASSES, part c). A writer enters
 * the story in an open contest (StoryContestCard, S1-E11-15). A cover made in Canva in another
 * tab shows up by itself when the writer comes back (ArrivedCoverNote, IDEAS-2d).
 * The liquid glass StorySettings board (bundle G9 WRITING, part d) adds the line under the
 * heading, "Manage chapters" and "See story page" beside it, "How readers will see it" (the
 * new story form's live preview) beside the form on wide screens, and a save bar that says
 * "You have unsaved changes" with Cancel, which puts every answer back.
 * Board D07 (BOOKS D07, user story 5.7) sets the order of the cards: the basics, category and
 * tags, the cover, status and comments, "Who can read this story?" (Visibility and App only in
 * one card, StoryWhoCanReadSection), where it shows, labels, the cover's badges, sharing with a
 * class, a contest and deleting, with the save bar last.
 * What it calls: useMyStories (the story), useStorySettingsForm (answers, checks,
 * update_my_story()), DeleteStoryControl (delete_my_story(), restore_my_story()),
 * StoryPreviewAside (the preview).
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { coverLookOf } from '@/components/covers/automaticCover';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';
import { StoryContestCard } from '@/features/contests/components/StoryContestCard';
import { StoryClassCard } from '@/features/spaces/components/StoryClassCard';
import { RankBadgePicker } from '@/features/tags/components/RankBadgePicker';

import type { MyStory } from '../api/stories';
import { useMyStories } from '../hooks/useMyStories';
import { useStoryFormOptions } from '../hooks/useStoryFormOptions';
import { useStorySettingsForm } from '../hooks/useStorySettingsForm';

import { ArrivedCoverNote } from './ArrivedCoverNote';
import { CategoryTagsSection } from './CategoryTagsSection';
import { CoverLookPicker } from './CoverLookPicker';
import { CoverSection } from './CoverSection';
import { DeleteStoryControl } from './DeleteStoryControl';
import { FlatFormSections, flatGroupClassName } from './FormSection';
import { StoryBasicsSection } from './StoryBasicsSection';
import { StoryLabelsSection } from './StoryLabelsSection';
import { StoryPreviewAside } from './StoryPreviewAside';
import { StorySettingsHeader } from './StorySettingsHeader';
import { StoryStatusSection } from './StoryStatusSection';
import { StoryWhereItShowsSection } from './StoryWhereItShowsSection';
import { StoryWhoCanReadSection } from './StoryWhoCanReadSection';

/** The message under the save button for each outcome. */
function SaveOutcome({ outcome }: { outcome: ReturnType<typeof useStorySettingsForm>['outcome'] }) {
  const { t } = useTranslation('writing');
  if (outcome === null) return null;
  if (outcome === 'saved') return <Notice tone="success">{t('settings.saved')}</Notice>;
  if (outcome === 'not_active') return <Notice tone="warning">{t('newStory.notActive')}</Notice>;
  return <Notice tone="error">{t('settings.saveFailed')}</Notice>;
}

/** The last group: delete the story (DeleteStoryControl), a flat group like the rest (D07). */
function DeleteStoryCard({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  return (
    <section aria-labelledby="delete-story-heading" className={flatGroupClassName}>
      <h2
        id="delete-story-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('deleteStory.heading')}
      </h2>
      <DeleteStoryControl story={story} />
    </section>
  );
}

/**
 * The save bar: the outcome of the last save, "You have unsaved changes" with Cancel while
 * something changed, and Save changes. It stays in view at the bottom of the window while the
 * writer scrolls the long form (the board's floating bar). Under 1024 px it sits above the
 * floating tab bar (14 px gap, 64 px bar, 14 px gap; app/shell/TabBar.tsx), so neither covers
 * the other.
 */
function SaveBar({ form }: { form: ReturnType<typeof useStorySettingsForm> }) {
  const { t } = useTranslation('writing');
  return (
    <div className="sticky bottom-[calc(92px+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-card border border-border bg-tint p-4 shadow-card lg:bottom-4">
      <SaveOutcome outcome={form.outcome} />
      <ButtonRow>
        <Button size="lg" type="submit" disabled={form.isSaving}>
          {form.isSaving ? t('settings.saving') : t('settings.save')}
        </Button>
        {form.isDirty && (
          <Button size="lg" variant="secondary" onClick={form.discard}>
            {t('settings.cancel')}
          </Button>
        )}
        {/* aria-live, so a screen reader hears it once something changes. */}
        <p aria-live="polite" className="m-0 type-body font-semibold text-ink">
          {form.isDirty ? t('settings.unsaved') : ''}
        </p>
      </ButtonRow>
    </div>
  );
}

/**
 * The form for one story, with the preview beside it from 1024 px (below it on smaller screens).
 * Board D07: the form takes 1.7 parts of the width and the preview 1, 64 px apart.
 */
function SettingsForm({ story, penName }: { story: MyStory; penName: string }) {
  const form = useStorySettingsForm(story);
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-16">
      <FlatFormSections>
        <SettingsFields story={story} penName={penName} form={form} />
      </FlatFormSections>
      <div className="w-full">
        <StoryPreviewAside answers={form.answers} penName={penName} hasDeleteNote={false} />
      </div>
    </div>
  );
}

/**
 * The cover: the drawn designs and uploads, its look and title font (CALM-4) and the note when a
 * new upload has arrived.
 *
 * @returns the cover's parts of the form
 */
function CoverFields({
  story,
  penName,
  form,
}: {
  story: MyStory;
  penName: string;
  form: ReturnType<typeof useStorySettingsForm>;
}) {
  return (
    <>
      <CoverSection
        storyId={story.id}
        title={form.answers.title}
        penName={penName}
        cover={form.answers.cover}
        onChange={(cover) => form.set('cover', cover)}
        canUpload
        look={coverLookOf(story)}
      />
      <CoverLookPicker story={story} formCoverKind={form.answers.cover.kind} />
      {form.arrivedCoverPath !== null && (
        <ArrivedCoverNote story={{ id: story.id, slug: story.slug, title: story.title }} />
      )}
    </>
  );
}

/** The form's sections, the save bar and the delete card. */
function SettingsFields({
  story,
  penName,
  form,
}: {
  story: MyStory;
  penName: string;
  form: ReturnType<typeof useStorySettingsForm>;
}) {
  const { t } = useTranslation('writing');
  const options = useStoryFormOptions();
  return (
    <form
      className="flex min-w-0 flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      {options.loadFailed && <Notice tone="error">{t('errors.loadFailed')}</Notice>}
      <StoryBasicsSection
        answers={form.answers}
        errors={form.errors}
        languages={options.languages}
        set={form.set}
      />
      <CategoryTagsSection
        answers={form.answers}
        errors={form.errors}
        categories={options.categories}
        set={form.set}
      />
      {/* The rest in board D07's order: the cover, then status and comments, who can read it,
          where it shows, labels, the badges, a class, a contest and deleting; the save bar
          comes last, so it stays in view the whole way down. */}
      <CoverFields story={story} penName={penName} form={form} />
      <StoryStatusSection
        answers={form.answers}
        set={form.set}
        pausedUntil={story.commentsPausedUntil}
      />
      <StoryWhoCanReadSection answers={form.answers} set={form.set} />
      <StoryWhereItShowsSection answers={form.answers} set={form.set} />
      <StoryLabelsSection answers={form.answers} errors={form.errors} set={form.set} />
      <RankBadgePicker slug={story.slug} />
      <StoryClassCard slug={story.slug} />
      <StoryContestCard slug={story.slug} />
      <DeleteStoryCard story={story} />
      <SaveBar form={form} />
    </form>
  );
}

/** What goes under the heading: a wait, a plain message, or the form. */
function SettingsBody({
  writing,
  story,
  penName,
}: {
  writing: ReturnType<typeof useMyStories>;
  story: MyStory | undefined;
  penName: string;
}) {
  const { t } = useTranslation('writing');
  if (!writing.isKnown) return null;
  if (!writing.isSignedIn) return <p className="m-0 text-ink-muted">{t('newStory.signedOut')}</p>;
  if (story === undefined) return <Notice tone="error">{t('settings.notFound')}</Notice>;
  return <SettingsForm story={story} penName={penName} />;
}

/**
 * Renders the page.
 *
 * @returns the settings screen, a wait, or a plain message
 */
export function StorySettingsPage() {
  const { t } = useTranslation('writing');
  const { storySlug = '' } = useParams();
  const writing = useMyStories();
  const { names } = useMyNames();
  const penName = names === null ? '' : (displayName(names.handle, names.penName) ?? '');
  const story = writing.stories.find((candidate) => candidate.slug === storySlug);

  return (
    // Board D07's spacing: 32 px between the header and the form on a phone, 48 from 768 px.
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-6 pb-6 md:gap-12 lg:pt-12">
      <title>{t('settings.documentTitle')}</title>
      <StorySettingsHeader story={story} />
      <SettingsBody writing={writing} story={story} penName={penName} />
    </PageContainer>
  );
}
