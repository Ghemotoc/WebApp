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
 * their class, or makes it public again (StoryClassCard, bundle CLASSES, part c).
 * What it calls: useMyStories (the story), useStorySettingsForm (answers, checks,
 * update_my_story()), DeleteStoryControl (delete_my_story(), restore_my_story()).
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
import { StoryClassCard } from '@/features/spaces/components/StoryClassCard';
import { RankBadgePicker } from '@/features/tags/components/RankBadgePicker';

import type { MyStory } from '../api/stories';
import { useMyStories } from '../hooks/useMyStories';
import { useStoryFormOptions } from '../hooks/useStoryFormOptions';
import { useStorySettingsForm } from '../hooks/useStorySettingsForm';

import { CategoryTagsSection } from './CategoryTagsSection';
import { CoverSection } from './CoverSection';
import { DeleteStoryControl } from './DeleteStoryControl';
import { StoryBasicsSection } from './StoryBasicsSection';
import { StoryLabelsSection } from './StoryLabelsSection';
import { StoryStatusSection } from './StoryStatusSection';

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

/** The form for one story. */
function SettingsForm({ story, penName }: { story: MyStory; penName: string }) {
  const { t } = useTranslation('writing');
  const form = useStorySettingsForm(story);
  const options = useStoryFormOptions();
  return (
    <form
      className="flex max-w-[760px] flex-col gap-5"
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
      <CoverSection
        storyId={story.id}
        title={form.answers.title}
        penName={penName}
        cover={form.answers.cover}
        onChange={(cover) => form.set('cover', cover)}
        canUpload
      />
      <StoryLabelsSection answers={form.answers} errors={form.errors} set={form.set} />
      <StoryStatusSection answers={form.answers} set={form.set} />
      <div className="flex flex-col gap-3 rounded-card bg-tint p-5">
        <SaveOutcome outcome={form.outcome} />
        <div>
          <Button size="lg" type="submit" disabled={form.isSaving}>
            {form.isSaving ? t('settings.saving') : t('settings.save')}
          </Button>
        </div>
      </div>
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
      <header className="flex max-w-[640px] flex-col gap-2">
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
      </header>
      <SettingsBody writing={writing} story={story} penName={penName} />
    </PageContainer>
  );
}
