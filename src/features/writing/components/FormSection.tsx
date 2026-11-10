/**
 * FormSection: one card of the new story form, a fieldset with its legend (story S1-E3-01).
 *
 * Board values (NewStory 4.2): a white card, 26 by 28 px padding, 24 px radius, the legend in
 * Funnel Display 700 at 26 px in the heading colour, 20 px between fields.
 * Who uses it: StoryBasicsSection, CategoryTagsSection, CoverSection and, later, the status,
 * where-to-read and labels sections (S1-E3-05, S1-E3-06).
 */
import type { ReactNode } from 'react';

/** What a FormSection needs. */
export interface FormSectionProps {
  legend: string;
  children: ReactNode;
}

/**
 * Renders the card.
 *
 * @returns the fieldset
 */
export function FormSection({ legend, children }: FormSectionProps) {
  return (
    <fieldset className="relative m-0 flex min-w-0 flex-col gap-5 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card">
      <legend className="float-left mb-4 w-fit max-w-full font-heading text-[26px] leading-[1.1] font-bold wrap-anywhere text-heading">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
