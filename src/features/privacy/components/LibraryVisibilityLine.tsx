/**
 * LibraryVisibilityLine: "Private. Only you can see your library. Change" on the Library page
 * (story S1-E13-01; board 3.7, the "Change" beside "Private" that S1-E4-03 left for this story).
 *
 * The words follow the reader's choice in Settings › Privacy; Change opens that panel. While the
 * choice loads, or if it can't be read, the line says "Private", which is everyone's default.
 * Who shows it: LibraryPage. What it calls: usePrivacySettings → my_privacy_settings().
 */
import { Link } from 'react-router';

import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/**
 * Renders the line.
 *
 * @returns the note with its Change link
 */
export function LibraryVisibilityLine() {
  const { t } = usePrivacyTranslation();
  const settings = usePrivacySettings();
  const audience = settings.data?.libraryAudience ?? 'only_me';
  return (
    <p className="m-0 w-fit rounded-full bg-tint px-4 py-2.5 text-sm text-body">
      <strong className="font-bold text-heading">{t(`libraryNote.${audience}.lead`)}</strong>{' '}
      {t(`libraryNote.${audience}.body`)}{' '}
      <Link
        to="/settings#privacy"
        aria-label={t('libraryNote.changeLabel')}
        className="inline-flex min-h-6 items-center font-semibold text-link underline"
      >
        {t('libraryNote.change')}
      </Link>
    </p>
  );
}
