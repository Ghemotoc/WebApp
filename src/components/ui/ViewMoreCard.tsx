/**
 * ViewMoreCard: the last card in a shelf that has more than 20 stories (story S1-E1-03).
 *
 * The rule (DoD; CLAUDE.md rule 20): a shelf shows at most 20 stories, then a "View more" card
 * that opens the See all page (S1-E5-09). It is a real link whose visible text is its whole
 * accessible name ("View more 54 in Trending"), so voice control users can say what they see
 * (WCAG 2.2, 2.5.3 Label in Name).
 * Look: the same width and 5:8 shape as the covers beside it (it fills its column; CALM-4), a 2 px
 * dashed border, a 52 px plum circle with an arrow and the words in the subheading style.
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 */
import { useTranslation } from 'react-i18next';

import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon';

/** What the card needs. */
export interface ViewMoreCardProps {
  href: string;
  shelfTitle: string;
  totalCount: number;
}

/**
 * Renders the card as one link.
 *
 * @returns the link
 */
export function ViewMoreCard({ href, shelfTitle, totalCount }: ViewMoreCardProps) {
  const { t } = useTranslation();

  return (
    <a
      href={href}
      className="flex aspect-[5/8] w-full flex-col items-start justify-center gap-3 rounded-cover border-2 border-dashed border-dashed-border p-4 no-underline"
    >
      <span className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-chip-on text-chip-on-text">
        <ArrowRightIcon size={22} />
      </span>
      <span className="type-subheading">{t('shelf.viewMore')}</span>
      <span className="type-meta">
        {t('shelf.viewMoreHint', { count: totalCount, title: shelfTitle })}
      </span>
    </a>
  );
}
