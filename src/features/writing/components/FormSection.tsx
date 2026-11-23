/**
 * FormSection: one card of a story form, a fieldset with its legend (story S1-E3-01).
 *
 * Board values (NewStory 4.2): a white card, 26 by 28 px padding, 24 px radius, the legend in
 * Funnel Display 700 at 26 px in the heading colour, 20 px between fields.
 * Inside the new story wizard (CALM-9, board D02) the wizard's step is already the card and its
 * title already says what the step is, so a section there drops its own card and keeps its
 * legend for screen readers only (InWizardFormSections).
 * Who uses it: StoryBasicsSection, CategoryTagsSection, CoverSection, StoryVisibilitySection,
 * StoryLabelsSection and the other story settings sections (S1-E3-05, S1-E3-06).
 */
import { createContext, useContext, type ReactNode } from 'react';

/** True inside a wizard step (NewStoryPage); false everywhere else. */
const InWizardContext = createContext(false);

/**
 * Wraps a wizard step's sections so they draw without their own card.
 *
 * @param props.children - the sections
 * @returns the children, told they are inside a wizard step
 */
export function InWizardFormSections({ children }: { children: ReactNode }) {
  return <InWizardContext.Provider value>{children}</InWizardContext.Provider>;
}

/** What a FormSection needs. */
export interface FormSectionProps {
  legend: string;
  children: ReactNode;
}

/**
 * Renders the card, or the plain fieldset inside a wizard step.
 *
 * @returns the fieldset
 */
export function FormSection({ legend, children }: FormSectionProps) {
  const isInWizard = useContext(InWizardContext);
  if (isInWizard) {
    return (
      <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="sr-only">{legend}</legend>
        {children}
      </fieldset>
    );
  }
  return (
    <fieldset className="relative m-0 flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-6 py-6 shadow-card">
      <legend className="float-left mb-4 w-fit max-w-full font-heading type-heading leading-[1.1] font-bold wrap-anywhere text-ink-heading">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
