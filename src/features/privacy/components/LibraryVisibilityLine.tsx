/**
 * LibraryVisibilityLine: "Private. Only you can see your library. Change" on the Library page
 * (story S1-E13-01; board 3.7, the "Change" beside "Private" that S1-E4-03 left for this story).
 *
 * The words follow the reader's choice in Settings › Privacy; Change opens that panel. While the
 * choice loads, or if it can't be read, the line says "Private", which is everyone's default.
 * Liquid glass look (bundle G7d2; board Library): a glass pill, with a small lock while the library
 * is private, as the board draws it.
 * Who shows it: LibraryPage. What it calls: usePrivacySettings → my_privacy_settings().
 */
import { Link } from 'react-router';

import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** The lock beside "Private", 14 px, in the text colour; decoration only (the word says it). */
function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      width="14"
      height="14"
      fill="none"
      className="mr-2 inline-block align-[-2px]"
    >
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

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
    <p className="m-0 w-fit glass-pill rounded-full px-4 py-2.5 text-sm text-body">
      {audience === 'only_me' && <LockIcon />}
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
