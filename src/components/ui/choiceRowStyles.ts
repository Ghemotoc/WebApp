/**
 * choiceRowStyles: the look of one choice in a settings radio group, as the full canvas's J boards
 * draw it (bundle 10, 25 Nov 2026; replaces the glass row of each choice from bundle G11b): a plain
 * radio with its words in semibold ink, one choice under the other. The radio is a real, visible
 * radio button, so the choice is shown by its dot, never by colour alone (WCAG 1.4.1); each row is
 * at least 32 px tall (CLAUDE.md rule 9: 24 px minimum targets).
 * Who uses it: AudienceRadios (Settings › Privacy) and MessageSettingsSection (Settings › Messages).
 */

/** The classes for the label that wraps one radio and its words. */
export const choiceRowClassName =
  'flex min-h-8 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 type-body font-semibold text-ink-heading';
