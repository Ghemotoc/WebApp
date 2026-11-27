/**
 * NewStoryPage: "Start a new story", screen 4.2 (story S1-E3-01; design/boards/NewStory.dc.html).
 *
 * Who shows it: the router, at /write/new; the "New story" button on /write leads here.
 * What it shows: the breadcrumb, the heading and intro, then the form as a five-step
 * wizard (CALM-9, board D02: the basics; category, tags and setting; cover; who can read it;
 * labels, rating and AI), the live preview beside it (after the steps below 1024 px) and the action
 * bar under the steps. Enter or "Next" moves on a step; "Create and write chapter one" works from
 * any step, and when a mistake is found it names the steps to finish and opens the first of them.
 * Coming from the hub's "Write from this prompt" (?prompt=<ID>, GAPS-12c), PromptNote shows the
 * prompt under the header and the new story remembers it.
 * What it calls: useNewStoryForm (the answers, checks and create_story()), useStoryFormOptions
 * (languages and categories), useMyNames (the pen name for the preview), useNewStorySteps and
 * useStepWizard with StepWizard (the steps).
 * Errors: a read-only account or a failed save shows a plain message above the buttons.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
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
import { WritingBreadcrumb } from './WritingBreadcrumb';

/**
 * The page header (board D02, user story 5.2): the breadcrumb "Writing / New story", the heading,
 * the intro and the writing prompt, if any.
 */
function NewStoryHeader() {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-3">
      <WritingBreadcrumb
        crumbs={[{ label: t('breadcrumb.writing'), to: '/write' }, { label: t('newStory.crumb') }]}
      />
      <header className="relative flex max-w-[640px] flex-col gap-2">
        <h1 className="m-0 type-title lg:type-display">{t('newStory.heading')}</h1>
        <p className="m-0 type-body text-ink-muted">{t('newStory.intro')}</p>
        {/* The writing prompt, when the writer came from the hub's "Write from this prompt". */}
        <PromptNote />
      </header>
    </div>
  );
}

/** What the action bar needs. */
interface NewStoryActionBarProps {
  formError: 'notActive' | 'createFailed' | null;
  /** The titles of the steps that still hold a mistake, after a press of Create. */
  missingSteps: string[];
  isSubmitting: boolean;
  onCreate: () => void;
}

/**
 * The rights line, what is still missing, and the two buttons, under every step (board D02, user
 * story 5.2): "Create and write chapter one" stays active from the first step and, when something
 * is missing, names the steps to finish in words above itself; "Cancel" goes back without saving.
 */
function NewStoryActionBar({
  formError,
  missingSteps,
  isSubmitting,
  onCreate,
}: NewStoryActionBarProps) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 max-w-[62ch] type-meta">{t('newStory.rights')}</p>
      {missingSteps.length > 0 && (
        <Notice tone="warning">{t('newStory.missing', { steps: missingSteps.join(', ') })}</Notice>
      )}
      {formError !== null && (
        <Notice tone={formError === 'notActive' ? 'warning' : 'error'}>
          {t(formError === 'notActive' ? 'newStory.notActive' : 'newStory.createFailed')}
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={isSubmitting} onClick={onCreate}>
          {isSubmitting ? t('newStory.creating') : t('newStory.create')}
        </Button>
        <Link to="/write" className={buttonClassName({ variant: 'text' })}>
          {t('newStory.cancel')}
        </Link>
      </div>
    </div>
  );
}

/**
 * The wizard's moves: "Next" checks the open step's own answers first; Create checks them all
 * and, on a mistake, opens the first step that holds one and names every such step.
 *
 * @returns the form, the wizard's place, the moves, the steps and the steps still missing
 */
function useNewStoryWizard(penName: string) {
  const form = useNewStoryForm();
  const options = useStoryFormOptions();
  const steps = useNewStorySteps({ ...form, ...options, penName });
  const wizard = useStepWizard(steps.length);
  const [missingSteps, setMissingSteps] = useState<string[]>([]);
  const isLastStep = wizard.openIndex === steps.length - 1;

  function next() {
    // The basics need a title and step 2 a category (FORMS-1); the other steps start with good answers.
    const fields = newStoryStepFields[wizard.openIndex] ?? [];
    if (form.checkFields(fields)) wizard.goToNextStep();
  }

  function create() {
    const fieldsWithMistakes = form.submit();
    // Step 1: the steps that hold a mistake, in order, named above the button.
    const stepIndexes = [...new Set(fieldsWithMistakes.map(stepOfField))].sort((a, b) => a - b);
    setMissingSteps(stepIndexes.map((index) => steps[index]?.title ?? ''));
    if (stepIndexes.length === 0) return;
    // Step 2: the first of them opens, unless it is already open.
    const firstStep = stepIndexes[0] ?? 0;
    if (firstStep !== wizard.openIndex) wizard.openStep(firstStep);
  }

  return { form, options, steps, wizard, isLastStep, missingSteps, next, create };
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
  const { form, options, steps, wizard, isLastStep, missingSteps, next, create } =
    useNewStoryWizard(penName);

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
      {/* Board D02: the steps and the buttons beside the preview from 1024 px; below it, the
          preview sits after the last step, just above the buttons (user story 5.2). */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-x-16">
        <form
          className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1"
          onSubmit={(event) => {
            // Enter in a field moves on a step; on the last step it creates the story.
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
            onBack={wizard.goToPreviousStep}
            lastStepActions={null}
          />
        </form>
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <StoryPreviewAside answers={form.answers} penName={penName} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <NewStoryActionBar
            formError={form.formError}
            missingSteps={missingSteps}
            isSubmitting={form.isSubmitting}
            onCreate={create}
          />
        </div>
      </div>
    </PageContainer>
  );
}
