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
 * What it calls: useMyStories (the story), useStorySettingsForm (answers, checks,
 * update_my_story()), DeleteStoryControl (delete_my_story(), restore_my_story()),
 * StoryPreviewAside (the preview).
 */
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
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
import { CoverSection } from './CoverSection';
import { DeleteStoryControl } from './DeleteStoryControl';
import { StoryBasicsSection } from './StoryBasicsSection';
import { StoryLabelsSection } from './StoryLabelsSection';
import { StoryPreviewAside } from './StoryPreviewAside';
import { StoryStatusSection } from './StoryStatusSection';
import { StoryVisibilitySection } from './StoryVisibilitySection';

/** The message under the save button for each outcome. */
function SaveOutcome({ outcome }: { outcome: ReturnType<typeof useStorySettingsForm>['outcome'] }) {
  const { t } = useTranslation('writing');
  if (outcome === null) return null;
  if (outcome === 'saved') return <Notice tone="success">{t('settings.saved')}</Notice>;
  if (outcome === 'not_active') return <Notice tone="warning">{t('newStory.notActive')}</Notice>;
  return <Notice tone="error">{t('settings.saveFailed')}</Notice>;
}

/** The card at the bottom: delete the story (DeleteStoryControl). */
function DeleteStoryCard({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  return (
    <section
      aria-labelledby="delete-story-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <Eyebrow>{t('deleteStory.eyebrow')}</Eyebrow>
      <h2 id="delete-story-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
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
    <div className="sticky bottom-[calc(92px+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-card border border-border bg-tint p-5 shadow-card lg:bottom-4">
      <SaveOutcome outcome={form.outcome} />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {/* aria-live, so a screen reader hears it once something changes. */}
        <p aria-live="polite" className="m-0 mr-auto text-sm font-semibold text-ink">
          {form.isDirty ? t('settings.unsaved') : ''}
        </p>
        {form.isDirty && (
          <Button size="lg" variant="secondary" onClick={form.discard}>
            {t('settings.cancel')}
          </Button>
        )}
        <Button size="lg" type="submit" disabled={form.isSaving}>
          {form.isSaving ? t('settings.saving') : t('settings.save')}
        </Button>
      </div>
    </div>
  );
}

/** The form for one story, with the preview beside it on wide screens (below it on phones). */
function SettingsForm({ story, penName }: { story: MyStory; penName: string }) {
  const form = useStorySettingsForm(story);
  return (
    <div className="flex flex-col gap-10 md:flex-row md:items-start">
      <SettingsFields story={story} penName={penName} form={form} />
      <div className="w-full flex-[1_1_320px] md:max-w-[400px]">
        <StoryPreviewAside answers={form.answers} penName={penName} hasDeleteNote={false} />
      </div>
    </div>
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
      className="flex min-w-0 flex-[999_1_560px] flex-col gap-5"
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
      <RankBadgePicker slug={story.slug} />
      <StoryClassCard slug={story.slug} />
      <StoryContestCard slug={story.slug} />
      <CoverSection
        storyId={story.id}
        title={form.answers.title}
        penName={penName}
        cover={form.answers.cover}
        onChange={(cover) => form.set('cover', cover)}
        canUpload
      />
      {form.arrivedCoverPath !== null && (
        <ArrivedCoverNote story={{ id: story.id, slug: story.slug, title: story.title }} />
      )}
      <StoryLabelsSection answers={form.answers} errors={form.errors} set={form.set} />
      <StoryVisibilitySection answers={form.answers} set={form.set} />
      <StoryStatusSection answers={form.answers} set={form.set} />
      <SaveBar form={form} />
      <DeleteStoryCard story={story} />
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
  if (!writing.isSignedIn) return <p className="m-0 text-body">{t('newStory.signedOut')}</p>;
  if (story === undefined) return <Notice tone="error">{t('settings.notFound')}</Notice>;
  return <SettingsForm story={story} penName={penName} />;
}

/** The header: back link, eyebrow, the story's title, the line under it and the two links. */
function SettingsHeader({ story }: { story: MyStory | undefined }) {
  const { t } = useTranslation('writing');
  return (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[760px] flex-col gap-2">
        <Link
          to="/write"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline hover:underline"
        >
          <ChevronLeftIcon />
          {t('newStory.back')}
        </Link>
        <Eyebrow>{t('settings.eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
          {story?.title ?? t('settings.heading')}
        </h1>
        {story !== undefined && (
          <p className="m-0 text-lg leading-relaxed text-body">{t('settings.intro')}</p>
        )}
      </div>
      {story !== undefined && (
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/write/s/${story.slug}/chapters`} className={headerLinkClass}>
            {t('storyCard.manageChapters')}
          </Link>
          <Link to={`/s/${story.slug}`} className={headerLinkClass}>
            {t('storyCard.seePage')}
          </Link>
        </div>
      )}
    </header>
  );
}

/** The two glass pills in the header (the board's clear pills). */
const headerLinkClass =
  'inline-flex h-12 items-center rounded-full button-glass px-[22px] text-[15px] font-semibold no-underline';

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
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-12 pb-7">
      <title>{t('settings.documentTitle')}</title>
      <SettingsHeader story={story} />
      <SettingsBody writing={writing} story={story} penName={penName} />
    </PageContainer>
  );
}
