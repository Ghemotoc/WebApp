/**
 * DraftCard: "Your draft" on Discover, the member's draft chapter saved most recently (story
 * S1-E5-12, bundle LOOK-4b; board Discover, "Your dashboard").
 *
 * Board values (liquid glass board Discover, bundle G7): a glass card in the side column with the
 * eyebrow, the draft's title in Funnel Display at 20 px ("Chapter 1, untitled" when it has none),
 * "<story> · 1,240 words · saved yesterday" and "Open draft" drawn as an outlined pill.
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
      className="flex flex-col gap-2 rounded-[28px] border border-border bg-surface p-[18px] text-inherit no-underline shadow-card"
    >
      <span className="eyebrow">{t('cards.draftEyebrow')}</span>
      <span className="font-heading text-xl leading-[1.15] font-bold break-words text-heading">
        {title}
      </span>
      <span className="text-[13px] text-body">
        {t('cards.draftMeta', {
          story: draft.storyTitle,
          words,
          when: timeAgo(draft.savedAt, i18n.language),
        })}
      </span>
      <span className="mt-1 inline-flex h-11 items-center self-start rounded-full border border-control-border px-[18px] text-sm font-semibold text-ink">
        {t('cards.openDraft')}
      </span>
    </Link>
  );
}
