/**
 * SpaceNotFound: "This space isn't here", with the way back to the spaces (bundle FORUMS-2,
 * part a; S1-E8-06). The database answers the same for a space that doesn't exist, one staff
 * removed and one the reader may not see, so nothing about a hidden space leaks.
 * Who shows it: SpacePage, SpaceSettingsPage and SpaceNewThreadPage.
 */
import { Link } from 'react-router';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the note.
 *
 * @returns the heading, the line under it and the link
 */
export function SpaceNotFound() {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="m-0 text-3xl font-extrabold">{t('space.notFound')}</h1>
      <p className="m-0 text-base text-body">{t('space.notFoundNote')}</p>
      <Link to="/spaces" className="inline-flex min-h-6 items-center text-link underline">
        {t('space.back')}
      </Link>
    </div>
  );
}
