/**
 * choiceRowStyles: the look of one choice in a settings radio group, as the canvas's Settings
 * board draws it (bundle G11b): each choice is its own glass row, and the chosen one carries a
 * plum border. The radio itself stays a real, visible radio button, so the choice is shown by the
 * dot and the border together, never by colour alone (WCAG 1.4.1).
 * Who uses it: AudienceRadios (Settings › Privacy) and MessageSettingsSection (Settings › Messages).
 */

/**
 * The classes for the label that wraps one radio and its words. `has-[:checked]` draws the border
 * when the radio inside is chosen, so the row needs no state of its own.
 */
export const choiceRowClassName =
  'flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[24px] border border-border bg-surface px-4 py-3 text-[15px] text-body has-[:checked]:border-primary has-[:checked]:shadow-[inset_0_0_0_0.5px_var(--color-primary)]';
