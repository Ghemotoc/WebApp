/**
 * NewStoryCard: "Start a new story" in the Read page's side column (story S1-E5-12, bundle
 * LOOK-4b; since CALM-7c a plain line, no card).
 *
 * The board New-Read leaves it out, but today's page has it, so it stays (handover Step 3: keep
 * every section) as the link with one line under it: nobody sees a story until it is published.
 * Who shows it: ReadSideColumn, only for a member who may write (is_active_member()).
 */
import { Link } from 'react-router';

import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the line.
 *
 * @returns the link and its line
 */
export function NewStoryCard() {
  const { t } = useDiscoveryTranslation();
  return (
    <div className="flex flex-col items-start gap-1">
      <Link to="/write/new" className="font-semibold text-link underline">
        {t('cards.newStoryTitle')}
      </Link>
      <p className="m-0 type-meta">{t('cards.newStoryText')}</p>
    </div>
  );
}
