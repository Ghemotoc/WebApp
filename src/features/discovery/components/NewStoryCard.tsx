/**
 * NewStoryCard: the gold "Start a new story" card on Discover (story S1-E5-12, bundle LOOK-4b;
 * board Discover, "Your dashboard", the house promo).
 *
 * Board values: a gold card with the "Write" eyebrow, "Start a new story" in Bricolage at 24 px,
 * one line saying nobody sees it until it is published, and "New story". The whole card is one
 * link to the new story page. The text stays dark on gold in both themes (--on-gold).
 * Who shows it: DiscoverCards, only for a member who may write (is_active_member()).
 */
import { Link } from 'react-router';

import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the card.
 *
 * @returns the card, one link
 */
export function NewStoryCard() {
  const { t } = useDiscoveryTranslation();
  return (
    <Link
      to="/write/new"
      className="flex flex-col gap-2 rounded-[24px] bg-gold p-[22px] text-on-gold no-underline"
    >
      <span className="eyebrow-type text-on-gold">{t('cards.writeEyebrow')}</span>
      <span className="font-heading text-2xl leading-[1.05] font-extrabold text-on-gold">
        {t('cards.newStoryTitle')}
      </span>
      <span className="text-sm leading-normal text-on-gold">{t('cards.newStoryText')}</span>
      <span className="mt-auto pt-1 text-sm font-semibold text-on-gold">
        {t('cards.newStoryLink')}
      </span>
    </Link>
  );
}
