/**
 * ProfileUnavailable: "This profile isn't available", with the way home (story S1-E5-05). The
 * same words for an unknown username, a removed profile and a person who blocks the reader, so a
 * block can't be told from a missing profile.
 * Who uses it: WriterProfilePage and ProfileBookshelvesPage.
 */
import { Link } from 'react-router';

import { usePeopleTranslation } from '../registerPeopleTranslations';

/**
 * Renders the card.
 *
 * @returns the card
 */
export function ProfileUnavailable() {
  const { t } = usePeopleTranslation();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-8">
      <title>{t('profile.unavailableTitle')}</title>
      <h1 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {t('profile.unavailableTitle')}
      </h1>
      <p className="m-0 type-body text-ink-muted">{t('profile.unavailableBody')}</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline"
      >
        {t('profile.goHome')}
      </Link>
    </div>
  );
}
