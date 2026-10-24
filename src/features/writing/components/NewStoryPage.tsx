/**
 * NewStoryPage: "Start a new story", screen 4.2 (story S1-E3-01; design/boards/NewStory.dc.html).
 *
 * Who shows it: the router, at /write/new; the "+ New story" button on /write leads here.
 * What it shows: the back link, the eyebrow, the heading and intro, then the form sections
 * (the basics, category and tags, cover, labels) and the action bar, with the live preview
 * beside them (below them on phones). The board's "Status and comments" section lives in story
 * settings (S1-E3-05) and "Where can people read this story?" is S1-E3-08 (after March).
 * What it calls: useNewStoryForm (the answers, checks and create_story()), useStoryFormOptions
 * (languages and categories), useMyNames (the pen name for the preview).
 * Errors: a read-only account or a failed save shows a plain message above the buttons.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Button } from '@/components/ui/Button';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';

import { useNewStoryForm } from '../hooks/useNewStoryForm';
import { useStoryFormOptions } from '../hooks/useStoryFormOptions';

import { CategoryTagsSection } from './CategoryTagsSection';
import { CoverSection } from './CoverSection';
import { StoryBasicsSection } from './StoryBasicsSection';
import { StoryLabelsSection } from './StoryLabelsSection';
import { StoryPreviewAside } from './StoryPreviewAside';

/** The page header: back link, eyebrow, heading, intro and its two doodles. */
function NewStoryHeader() {
  const { t } = useTranslation('writing');
  return (
    <header className="relative flex max-w-[640px] flex-col gap-2">
      <Link
        to="/write"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline hover:underline"
      >
        <ChevronLeftIcon />
        {t('newStory.back')}
      </Link>
      <Eyebrow>{t('newStory.eyebrow')}</Eyebrow>
      <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
        {t('newStory.heading')}
      </h1>
      <p className="m-0 text-lg leading-[1.6] text-body">{t('newStory.intro')}</p>
      <Doodle
        name="once-upon-a-time"
        kind="background"
        hideBelow="wide"
        className="absolute top-0 -right-[260px] w-[200px]"
      />
      <Doodle
        name="fountain-pen"
        kind="background"
        hideBelow="wide"
        className="absolute -right-[420px] bottom-0 w-24 rotate-12"
      />
    </header>
  );
}

/** The rights line and the two buttons. */
function NewStoryActionBar({
  formError,
  isSubmitting,
  onCreate,
}: {
  formError: 'notActive' | 'createFailed' | null;
  isSubmitting: boolean;
  onCreate: () => void;
}) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-4 rounded-card bg-tint p-5">
      <p className="m-0 text-sm leading-normal text-(--info-text)">{t('newStory.rights')}</p>
      {formError !== null && (
        <Notice tone={formError === 'notActive' ? 'warning' : 'error'}>
          {t(formError === 'notActive' ? 'newStory.notActive' : 'newStory.createFailed')}
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/write"
          className="inline-flex h-12 items-center rounded-full border border-control-border bg-surface px-6 text-[15px] font-semibold text-heading no-underline hover:bg-tint"
        >
          {t('newStory.cancel')}
        </Link>
        <Button size="lg" type="submit" disabled={isSubmitting} onClick={onCreate}>
          {isSubmitting ? t('newStory.creating') : t('newStory.create')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the new story screen
 */
export function NewStoryPage() {
  const { t } = useTranslation('writing');
  const form = useNewStoryForm();
  const options = useStoryFormOptions();
  const { names, isKnown, isSignedIn } = useMyNames();
  const penName = names === null ? '' : (displayName(names.handle, names.penName) ?? '');

  if (isKnown && !isSignedIn) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-7">
        <title>{t('newStory.documentTitle')}</title>
        <p className="m-0 text-body">{t('newStory.signedOut')}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-12 pb-7">
      <title>{t('newStory.documentTitle')}</title>
      <NewStoryHeader />
      {options.loadFailed && <Notice tone="error">{t('errors.loadFailed')}</Notice>}
      <div className="flex flex-col gap-10 md:flex-row md:items-start">
        <form
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            form.submit();
          }}
        >
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
          <CoverSection
            storyId={form.answers.storyId}
            title={form.answers.title}
            penName={penName}
            cover={form.answers.cover}
            onChange={(cover) => form.set('cover', cover)}
          />
          <StoryLabelsSection answers={form.answers} errors={form.errors} set={form.set} />
          <NewStoryActionBar
            formError={form.formError}
            isSubmitting={form.isSubmitting}
            onCreate={() => undefined}
          />
        </form>
        <div className="w-full flex-[1_1_320px] md:max-w-[400px]">
          <StoryPreviewAside answers={form.answers} penName={penName} />
        </div>
      </div>
    </PageContainer>
  );
}
