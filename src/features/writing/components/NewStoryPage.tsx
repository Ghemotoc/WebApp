/**
 * NewStoryPage: "Start a new story", screen 4.2 (story S1-E3-01; design/boards/NewStory.dc.html).
 *
 * Who shows it: the router, at /write/new; the "New story" button on /write leads here.
 * What it shows: the back link, the eyebrow, the heading and intro, then the form as a five-step
 * wizard (CALM-9, board D02: the basics; category, tags and setting; cover; who can read it;
 * labels, rating and AI) ending in the action bar, with the live preview beside it (below it on
 * phones). Enter or "Next" moves on a step; only the last step creates the story, and when a
 * mistake is found there the step that holds it opens again.
 * Coming from the hub's "Write from this prompt" (?prompt=<ID>, GAPS-12c), PromptNote shows the
 * prompt under the header and the new story remembers it.
 * What it calls: useNewStoryForm (the answers, checks and create_story()), useStoryFormOptions
 * (languages and categories), useMyNames (the pen name for the preview), useNewStorySteps and
 * useStepWizard with StepWizard (the steps).
 * Errors: a read-only account or a failed save shows a plain message above the buttons.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { StepWizard } from '@/components/ui/StepWizard';
import { useStepWizard } from '@/components/ui/useStepWizard';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';
import { PromptNote } from '@/features/hub/components/PromptNote';

import { useNewStoryForm } from '../hooks/useNewStoryForm';
import { newStoryStepFields, stepOfField, useNewStorySteps } from '../hooks/useNewStorySteps';
import { useStoryFormOptions } from '../hooks/useStoryFormOptions';

import { StoryPreviewAside } from './StoryPreviewAside';

/** The page header: back link, eyebrow, heading, intro and the writing prompt, if any. */
function NewStoryHeader() {
  const { t } = useTranslation('writing');
  return (
    <header className="relative flex max-w-[640px] flex-col gap-2">
      <Link
        to="/write"
        className="inline-flex min-h-11 items-center gap-2 self-start type-body font-semibold no-underline hover:underline"
      >
        <ChevronLeftIcon />
        {t('newStory.back')}
      </Link>
      <Eyebrow>{t('newStory.eyebrow')}</Eyebrow>
      <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-bold tracking-[-0.025em]">
        {t('newStory.heading')}
      </h1>
      <p className="m-0 type-long leading-[1.6] text-ink-muted">{t('newStory.intro')}</p>
      {/* The writing prompt, when the writer came from the hub's "Write from this prompt". */}
      <PromptNote />
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
    <div className="flex flex-col gap-4 border-t border-hairline pt-4">
      <p className="m-0 type-body leading-normal text-(--info-text)">{t('newStory.rights')}</p>
      {formError !== null && (
        <Notice tone={formError === 'notActive' ? 'warning' : 'error'}>
          {t(formError === 'notActive' ? 'newStory.notActive' : 'newStory.createFailed')}
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/write"
          className="inline-flex h-12 items-center rounded-full button-glass px-6 type-body font-semibold no-underline"
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
 * The wizard's moves: "Next" checks the open step's own answers first; Create checks them all
 * and, on a mistake, opens the first step that holds one.
 *
 * @returns the form, the wizard's place, the moves and the steps
 */
function useNewStoryWizard(penName: string) {
  const form = useNewStoryForm();
  const options = useStoryFormOptions();
  const steps = useNewStorySteps({ ...form, ...options, penName });
  const wizard = useStepWizard(steps.length);
  const isLastStep = wizard.openIndex === steps.length - 1;

  function next() {
    // Only the basics have a must-have (the title); the other steps start with good answers.
    const fields = newStoryStepFields[wizard.openIndex] ?? [];
    if (form.checkFields(fields)) wizard.goToNextStep();
  }

  function create() {
    const fieldsWithMistakes = form.submit();
    if (fieldsWithMistakes.length === 0) return;
    const firstStep = Math.min(...fieldsWithMistakes.map(stepOfField));
    if (firstStep !== wizard.openIndex) wizard.openStep(firstStep);
  }

  return { form, options, steps, wizard, isLastStep, next, create };
}

/**
 * Renders the page.
 *
 * @returns the new story screen
 */
export function NewStoryPage() {
  const { t } = useTranslation('writing');
  const { names, isKnown, isSignedIn } = useMyNames();
  const penName = names === null ? '' : (displayName(names.handle, names.penName) ?? '');
  const { form, options, steps, wizard, isLastStep, next, create } = useNewStoryWizard(penName);

  if (isKnown && !isSignedIn) {
    return (
      <PageContainer className="tmc-rise pt-12 pb-6">
        <title>{t('newStory.documentTitle')}</title>
        <p className="m-0 text-ink-muted">{t('newStory.signedOut')}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-12 pb-6">
      <title>{t('newStory.documentTitle')}</title>
      <NewStoryHeader />
      {options.loadFailed && <Notice tone="error">{t('errors.loadFailed')}</Notice>}
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <form
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-4"
          onSubmit={(event) => {
            // Enter in a field moves on a step; only the last step creates the story.
            event.preventDefault();
            if (isLastStep) create();
            else next();
          }}
        >
          <StepWizard
            label={t('newStory.stepsLabel')}
            steps={steps}
            openIndex={wizard.openIndex}
            furthestIndex={wizard.furthestIndex}
            onOpenStep={wizard.openStep}
            onNext={next}
            onSkip={wizard.goToNextStep}
            lastStepActions={
              <NewStoryActionBar
                formError={form.formError}
                isSubmitting={form.isSubmitting}
                onCreate={() => undefined}
              />
            }
          />
        </form>
        <div className="w-full flex-[1_1_320px] md:max-w-[400px]">
          <StoryPreviewAside answers={form.answers} penName={penName} />
        </div>
      </div>
    </PageContainer>
  );
}
