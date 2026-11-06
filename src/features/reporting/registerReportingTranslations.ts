/**
 * Adds the reporting text (the "reporting" namespace) to the translations when a Report button
 * first renders (story S1-E10-01).
 *
 * Why not with the rest: the dialog's text is only needed where a Report button is, so it travels
 * with the component, as the staff and design pages do with theirs.
 * Who calls it: ReportButton, before it renders anything.
 */
import { createNamespaceTranslations } from '@/lib/namespace-translations';
import englishReporting from '@/locales/en/reporting.json';
import romanianReporting from '@/locales/ro/reporting.json';

const reportingTranslations = createNamespaceTranslations(
  'reporting',
  romanianReporting,
  englishReporting,
);

/**
 * Registers the reporting texts once; calling it again does nothing.
 *
 * @param i18n - the app's translation instance (from useTranslation())
 */
export const registerReportingTranslations = reportingTranslations.register;
