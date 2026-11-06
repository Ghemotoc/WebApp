/**
 * DraftCard: "Your draft" on Discover, the member's draft chapter saved most recently (story
 * S1-E5-12, bundle LOOK-4b; board Discover, "Your dashboard").
 *
 * Board values: a white card with the eyebrow, the draft's title in Bricolage at 22 px ("Chapter
 * 1, untitled" when it has none), "<story> · 1,240 words · saved yesterday" and "Open draft".
 * The whole card is one link to the chapter editor.
 * Who shows it: DiscoverCards. What it calls: timeAgo for "saved 2 days ago".
 */
import { Link } from 'react-router';

import { timeAgo } from '@/features/comments/lib/timeAgo';
import { dateLocaleFor } from '@/lib/romania-time';

import type { DraftCardData } from '../api/discoverCards';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the card.
 *
 * @param props.draft - the draft chapter and its story
 * @returns the card, one link
 */
export function DraftCard({ draft }: { draft: DraftCardData }) {
  const { t, i18n } = useDiscoveryTranslation();
  // Step 1: the title, or "Chapter n, untitled" while the writer hasn't given one.
  const title =
    draft.title.trim() === '' ? t('cards.untitled', { number: draft.number }) : draft.title;
  // Step 2: the line under it, with the words counted the reader's way.
  const words = t('cards.words', {
    count: draft.wordCount,
    formatted: new Intl.NumberFormat(dateLocaleFor(i18n.language)).format(draft.wordCount),
  });
  return (
    <Link
      to={`/write/s/${encodeURIComponent(draft.storySlug)}/c/${draft.chapterCode}`}
      className="flex flex-col gap-2 rounded-[24px] border border-border bg-surface p-[22px] text-inherit no-underline shadow-card"
    >
      <span className="eyebrow">{t('cards.draftEyebrow')}</span>
      <span className="font-heading text-[22px] leading-[1.15] font-bold break-words text-heading">
        {title}
      </span>
      <span className="text-sm text-body">
        {t('cards.draftMeta', {
          story: draft.storyTitle,
          words,
          when: timeAgo(draft.savedAt, i18n.language),
        })}
      </span>
      <span className="mt-auto pt-1 text-sm font-semibold text-link">{t('cards.openDraft')}</span>
    </Link>
  );
}
