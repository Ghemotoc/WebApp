/**
 * NewStoryCard: the "Start a new story" card on Discover (story S1-E5-12, bundle LOOK-4b;
 * board Discover, "Your dashboard", the house promo).
 *
 * Board values: the "Write" eyebrow, "Start a new story" in Funnel Display at 20 px, one line saying
 * nobody sees it until it is published, and "New story". Since bundle G7 it is a glass card in the
 * side column like Your draft, no longer gold: top cards stay light and calm (design rulebook,
 * "Top cards"), and the main colour is kept for the buttons. The whole card is one link to the
 * new story page.
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
      className="flex flex-col gap-2 rounded-[28px] border border-border bg-surface p-[18px] text-inherit no-underline shadow-card"
    >
      <span className="eyebrow">{t('cards.writeEyebrow')}</span>
      <span className="font-heading text-xl leading-[1.15] font-bold text-heading">
        {t('cards.newStoryTitle')}
      </span>
      <span className="text-[13px] leading-normal text-body">{t('cards.newStoryText')}</span>
      <span className="mt-1 inline-flex h-11 items-center self-start rounded-full border border-control-border px-[18px] text-sm font-semibold text-ink">
        {t('cards.newStoryLink')}
      </span>
    </Link>
  );
}
