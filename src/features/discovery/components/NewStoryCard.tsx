/**
 * NewStoryCard: "Start a new story" in the Read page's row of cards (story S1-E5-12, bundle
 * LOOK-4b; since user story 1.4 board A04: a heading, one line saying nobody sees a story until
 * it is published, and a quiet "Start a new story" button).
 * Who shows it: ReadSideColumn, only for a member who may write (is_active_member()).
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the card's content (ReadSideColumn draws its paper).
 *
 * @returns the section
 */
export function NewStoryCard() {
  const { t } = useDiscoveryTranslation();
  return (
    <section aria-labelledby="read-new-story-heading" className="flex flex-col items-start gap-2">
      <h2 id="read-new-story-heading" className="m-0 type-subheading">
        {t('cards.newStoryTitle')}
      </h2>
      <p className="m-0 text-ink-muted">{t('cards.newStoryText')}</p>
      <Link to="/write/new" className={buttonClassName({ variant: 'secondary' }, 'mt-2')}>
        {t('cards.newStoryTitle')}
      </Link>
    </section>
  );
}
