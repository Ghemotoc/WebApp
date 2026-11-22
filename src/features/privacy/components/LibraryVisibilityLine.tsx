/**
 * LibraryVisibilityLine: "Private · Only you can see this library · Change" on the Library page
 * (story S1-E13-01; board 3.7, the "Change" beside "Private" that S1-E4-03 left for this story).
 *
 * The words follow the reader's choice in Settings › Privacy; Change opens that panel. While the
 * choice loads, or if it can't be read, the line says "Private", which is everyone's default.
 * Simplified look (bundle CALM-7c, board New-Library): a meta line under the page title, the
 * state first in bold, then who can see it, then Change; no pill and no lock (MetaLine rules).
 * Who shows it: LibraryPage. What it calls: usePrivacySettings → my_privacy_settings().
 */
import { Link } from 'react-router';

import { usePrivacySettings } from '../hooks/usePrivacySettings';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/**
 * Renders the line.
 *
 * @returns the meta line with its Change link
 */
export function LibraryVisibilityLine() {
  const { t } = usePrivacyTranslation();
  const settings = usePrivacySettings();
  const audience = settings.data?.libraryAudience ?? 'only_me';
  // The meta-line class draws the middots between the three parts, as MetaLine does; this line
  // builds its own list because its last part is a link, which MetaLine (text only) can't hold.
  return (
    <ul className="meta-line">
      <li className="font-bold text-ink">{t(`libraryNote.${audience}.lead`)}</li>
      <li>{t(`libraryNote.${audience}.body`)}</li>
      <li>
        <Link
          to="/settings#privacy"
          aria-label={t('libraryNote.changeLabel')}
          className="inline-flex min-h-6 items-center font-semibold text-link underline"
        >
          {t('libraryNote.change')}
        </Link>
      </li>
    </ul>
  );
}
