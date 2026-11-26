/**
 * FormSection: one card of a story form, a fieldset with its legend (story S1-E3-01).
 *
 * Board values (NewStory 4.2): a white card, 26 by 28 px padding, 24 px radius, the legend in
 * Funnel Display 700 at 26 px in the heading colour, 20 px between fields.
 * Inside the new story wizard (CALM-9, board D02) the wizard's step is already the card and its
 * title already says what the step is, so a section there drops its own card and keeps its
 * legend for screen readers only (InWizardFormSections).
 * On Story settings (board D07, user story 5.7) every section is a flat group instead: a 1 px
 * line above, 24 px under it, the legend as a heading and no card (FlatFormSections).
 * Who uses it: StoryBasicsSection, CategoryTagsSection, CoverSection, StoryVisibilitySection,
 * StoryLabelsSection and the other story settings sections (S1-E3-05, S1-E3-06).
 */
import { createContext, useContext, type ReactNode } from 'react';

/** How a section draws: its own card, plain inside a wizard step, or a flat group (D07). */
type SectionLook = 'card' | 'wizard' | 'flat';

/** The look for the sections below; a card unless a wrapper says otherwise. */
const SectionLookContext = createContext<SectionLook>('card');

/** The flat group's classes, shared with the settings cards that aren't a fieldset (D07). */
export const flatGroupClassName = 'flex min-w-0 flex-col gap-4 border-t border-border pt-6';

/**
 * Wraps a wizard step's sections so they draw without their own card.
 *
 * @param props.children - the sections
 * @returns the children, told they are inside a wizard step
 */
export function InWizardFormSections({ children }: { children: ReactNode }) {
  return <SectionLookContext.Provider value="wizard">{children}</SectionLookContext.Provider>;
}

/**
 * Wraps Story settings' sections so each draws as a flat group under a fine line (board D07).
 *
 * @param props.children - the sections
 * @returns the children, told to draw flat
 */
export function FlatFormSections({ children }: { children: ReactNode }) {
  return <SectionLookContext.Provider value="flat">{children}</SectionLookContext.Provider>;
}

/** What a FormSection needs. */
export interface FormSectionProps {
  legend: string;
  children: ReactNode;
}

/**
 * Renders the card, the plain fieldset inside a wizard step, or the flat group on Story settings.
 *
 * @returns the fieldset
 */
export function FormSection({ legend, children }: FormSectionProps) {
  const look = useContext(SectionLookContext);
  if (look === 'wizard') {
    return (
      <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="sr-only">{legend}</legend>
        {children}
      </fieldset>
    );
  }
  if (look === 'flat') {
    // The legend floats inside the fieldset, so the line above stays a plain line (no gap).
    return (
      <fieldset className={`m-0 border-x-0 border-b-0 px-0 pb-0 ${flatGroupClassName}`}>
        <legend className="float-left mb-4 w-fit max-w-full p-0 font-heading type-heading leading-[1.1] font-bold wrap-anywhere text-ink-heading">
          {legend}
        </legend>
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
