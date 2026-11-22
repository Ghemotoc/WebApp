/**
 * DraftCard: the member's latest draft in the Read page's side column (story S1-E5-12, bundle
 * LOOK-4b; since CALM-7c the simplified board New-Read).
 *
 * Board values: no card around it. The heading "Draft", the draft's title as a link to the
 * chapter editor ("Chapter 1, untitled" when it has none), the meta line "<story> · 1,240 words ·
 * saved yesterday" and a quiet "Open draft".
 * Who shows it: ReadSideColumn. What it calls: timeAgo for "saved 2 days ago" and MetaLine.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { dateLocaleFor } from '@/lib/romania-time';

import type { DraftCardData } from '../api/discoverCards';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the section.
 *
 * @param props.draft - the draft chapter and its story
 * @returns the section
 */
export function DraftCard({ draft }: { draft: DraftCardData }) {
  const { t, i18n } = useDiscoveryTranslation();
  const editorAddress = `/write/s/${encodeURIComponent(draft.storySlug)}/c/${draft.chapterCode}`;
  // Step 1: the title, or "Chapter n, untitled" while the writer hasn't given one.
  const title =
    draft.title.trim() === '' ? t('cards.untitled', { number: draft.number }) : draft.title;
  // Step 2: the facts, with the words counted the reader's way.
  const words = t('cards.words', {
    count: draft.wordCount,
    formatted: new Intl.NumberFormat(dateLocaleFor(i18n.language)).format(draft.wordCount),
  });
  const facts = [
    { text: draft.storyTitle },
    { text: words },
    { text: t('cards.savedWhen', { when: timeAgo(draft.savedAt, i18n.language) }) },
  ];
  return (
    <section aria-labelledby="read-draft-heading" className="flex flex-col items-start gap-2">
      <h2 id="read-draft-heading" className="m-0 type-subheading">
        {t('cards.draftEyebrow')}
      </h2>
      <Link
        to={editorAddress}
        className="font-semibold break-words text-heading no-underline hover:underline"
      >
        {title}
      </Link>
      <MetaLine facts={facts} />
      <Link
        to={editorAddress}
        className="mt-1 inline-flex h-11 items-center rounded-full button-glass px-5 font-semibold no-underline"
      >
        {t('cards.openDraft')}
      </Link>
    </section>
  );
}
