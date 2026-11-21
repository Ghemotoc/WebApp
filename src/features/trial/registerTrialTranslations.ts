/**
 * The trial's text (TRIAL-FEEDBACK and TRIAL-DESKTOP): the "Report a bug" panel and the
 * computers-only page, in src/locales/<language>/trial.json.
 *
 * Who calls it: BugReportTab and ComputerOnlyPage, which load only while their flag is on, so
 * this text never travels with a reader's first download.
 * What it calls: src/lib/namespace-translations.ts.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishTrial from '@/locales/en/trial.json';
import romanianTrial from '@/locales/ro/trial.json';

const trialTranslations = createNamespaceTranslations('trial', romanianTrial, englishTrial);

/** useTranslation('trial'), after making sure the text is registered. */
export const useTrialTranslation = trialTranslations.useNamespaceTranslation;
