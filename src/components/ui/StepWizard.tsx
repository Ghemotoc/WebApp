/**
 * StepWizard: a long form as numbered steps, one open at a time (CALM-9, the rule for every page:
 * "Long forms are wizards"; boards D02 New story and H08 Waitlist).
 *
 * How each step looks (the boards' `.wz` steps, user story 5.2): every step is a box (the one box
 * surface with its 1 px edge), its fields indented under the title.
 * - The open step: a filled number circle in the main action colour, its title at 24 px, its
 *   fields, then a row over a hairline with "Back" on the left (from the second step) and "Skip
 *   this step" (only when the step is optional) and "Next: [next step]" on the right. The last
 *   step shows "Back" and the page's own buttons instead. It carries aria-current="step".
 * - A done step folds to a check in a tinted circle, its title, a one-line summary ("The Weather
 *   Station · English") and a Change text button that opens it again.
 * - A later step shows only its number and title, in muted text.
 * Keyboard: every button is a real button; when a step opens, focus moves to its title, so a
 * keyboard or screen reader user lands at the start of the new step.
 * Who uses it: NewStoryPage (D02) and the waiting list's WaitlistProfileSteps (H08). What it
 * calls: nothing; useStepWizard keeps its place and the page decides what "Next" checks first.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { cn } from '@/lib/utils';

import { Button } from './Button';

/** One step of the wizard. */
export interface WizardStep {
  /** A stable key, for React. */
  key: string;
  title: string;
  /** What a done step says about its answers, on one line. */
  summary: string;
  /** Optional steps get "Skip this step". */
  isOptional: boolean;
  /** The step's fields. */
  content: ReactNode;
}

/** What the wizard needs. */
export interface StepWizardProps {
  /** The name of the list of steps, for screen readers ("Steps to start a story"). */
  label: string;
  steps: WizardStep[];
  openIndex: number;
  furthestIndex: number;
  /** Opens a done step again (its Change button). */
  onOpenStep: (index: number) => void;
  /** "Next": the page checks the step's answers, then moves on. */
  onNext: () => void;
  /** "Skip this step": moves on without checking. */
  onSkip: () => void;
  /** "Back": opens the step before, without checking (shown from the second step). */
  onBack: () => void;
  /** The last step's own buttons, before its Back; null when the page puts them elsewhere (the
   * new story form keeps Create and Cancel under every step, board D02). */
  lastStepActions: ReactNode;
}

/** The round number tile: filled when open, a check when done, an outline when later. */
function StepNumber({ number, state }: { number: number; state: 'open' | 'done' | 'later' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full type-body font-semibold',
        state === 'open' && 'button-main',
        state === 'done' && 'bg-tint text-accent',
        state === 'later' && 'border border-border text-ink-muted',
      )}
    >
      {state === 'done' ? <CheckIcon size={14} /> : number}
    </span>
  );
}

/**
 * The next step's title as "Next: cover" says it: its first letter small, because it follows a
 * colon in the middle of a sentence (board D02).
 *
 * @param title - the next step's title ("Cover")
 * @returns the title with a small first letter ("cover")
 */
function inSentence(title: string): string {
  return title.charAt(0).toLocaleLowerCase() + title.slice(1);
}

/** "Back" on the left of an open step's row, or an empty space on the first step. */
function BackButton({ isShown, onBack }: { isShown: boolean; onBack: () => void }) {
  const { t } = useTranslation('common');
  // An empty space keeps the other buttons on the right when there is no step before.
  if (!isShown) return <span />;
  return (
    <Button type="button" variant="text" onClick={onBack}>
      {t('wizard.back')}
    </Button>
  );
}

/** The row at the end of an open step: Back on the left, Skip and Next on the right. */
function StepActions({
  step,
  nextTitle,
  hasBack,
  onNext,
  onSkip,
  onBack,
}: {
  step: WizardStep;
  nextTitle: string;
  hasBack: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-2">
      <BackButton isShown={hasBack} onBack={onBack} />
      <div className="ml-auto flex flex-wrap items-center gap-3">
        {step.isOptional && (
          <Button type="button" variant="text" onClick={onSkip}>
            {t('wizard.skip')}
          </Button>
        )}
        <Button
          type="button"
          className="h-auto min-h-11 py-2 text-left whitespace-normal"
          onClick={onNext}
        >
          {t('wizard.next', { step: inSentence(nextTitle) })}
        </Button>
      </div>
    </div>
  );
}

/** The last step's row: Back on the left, the page's own buttons after it. */
function LastStepActions({ actions, onBack }: { actions: ReactNode; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {actions}
      <div className="border-t border-hairline pt-2">
        <BackButton isShown onBack={onBack} />
      </div>
    </div>
  );
}

/** A done step folded to its title, summary and Change button. */
function DoneStep({
  step,
  number,
  onChange,
}: {
  step: WizardStep;
  number: number;
  onChange: () => void;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center gap-4">
      <StepNumber number={number} state="done" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="m-0 font-heading type-long leading-[26px] font-bold text-ink-heading">
          {step.title}
          <span className="sr-only">{t('wizard.done')}</span>
        </h2>
        <p className="m-0 type-meta break-words">{step.summary}</p>
      </div>
      <Button
        type="button"
        variant="text"
        aria-label={t('wizard.changeStep', { step: step.title })}
        onClick={onChange}
      >
        {t('wizard.change')}
      </Button>
    </div>
  );
}

/** The box every step sits in: the one box surface with its edge (the boards' `.wz-step`). */
const stepBox = 'rounded-card border border-border bg-surface';

/** A later step: only its number and title, muted. */
function LaterStep({ step, number }: { step: WizardStep; number: number }) {
  return (
    <li className={cn(stepBox, 'flex items-center gap-4 px-6 py-4')}>
      <StepNumber number={number} state="later" />
      <h2 className="m-0 font-heading type-long leading-[26px] font-semibold text-ink-muted">
        {step.title}
      </h2>
    </li>
  );
}

/** The open step: its title (focused when it opens), its fields and its row of buttons. */
function OpenStep({
  step,
  number,
  titleRef,
  actions,
}: {
  step: WizardStep;
  number: number;
  titleRef: RefObject<HTMLHeadingElement | null>;
  actions: ReactNode;
}) {
  return (
    <li aria-current="step" className={cn(stepBox, 'flex flex-col gap-4 px-6 pt-4 pb-6')}>
      <div className="flex items-center gap-4">
        <StepNumber number={number} state="open" />
        <h2
          ref={titleRef}
          tabIndex={-1}
          className="m-0 font-heading type-heading leading-[1.1] font-bold break-words text-ink-heading"
        >
          {step.title}
        </h2>
      </div>
      {/* The fields sit under the title, past the number, from 768 px (the boards' indent). */}
      <div className="flex flex-col gap-4 md:pl-12">
        {step.content}
        {actions}
      </div>
    </li>
  );
}

/**
 * Moves focus to the open step's title whenever another step opens; never on the first render,
 * so the page's own focus (the top of the page) stays where it is.
 *
 * @param openIndex - the open step
 * @returns the ref to put on the open step's title
 */
function useFocusOpenStep(openIndex: number) {
  const openTitleRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    openTitleRef.current?.focus();
  }, [openIndex]);
  return openTitleRef;
}

/**
 * Renders the steps.
 *
 * @returns an ordered list, one item per step
 */
export function StepWizard({
  label,
  steps,
  openIndex,
  furthestIndex,
  onOpenStep,
  onNext,
  onSkip,
  onBack,
  lastStepActions,
}: StepWizardProps) {
  const openTitleRef = useFocusOpenStep(openIndex);
  return (
    <ol aria-label={label} className="m-0 flex list-none flex-col gap-4 p-0">
      {steps.map((step, index) => {
        const number = index + 1;
        if (index > furthestIndex) return <LaterStep key={step.key} step={step} number={number} />;
        // A done step, folded.
        if (index !== openIndex) {
          return (
            <li key={step.key} className={cn(stepBox, 'px-6 py-4')}>
              <DoneStep step={step} number={number} onChange={() => onOpenStep(index)} />
            </li>
          );
        }
        // The open step ends with Back, Skip and Next, or Back and the page's own buttons.
        const nextStep = steps[index + 1];
        const actions =
          nextStep === undefined ? (
            <LastStepActions actions={lastStepActions} onBack={onBack} />
          ) : (
            <StepActions
              step={step}
              nextTitle={nextStep.title}
              hasBack={index > 0}
              onNext={onNext}
              onSkip={onSkip}
              onBack={onBack}
            />
          );
        return (
          <OpenStep
            key={step.key}
            step={step}
            number={number}
            titleRef={openTitleRef}
            actions={actions}
          />
        );
      })}
    </ol>
  );
}
