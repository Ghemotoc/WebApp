/**
 * ViewMoreCard: the last card in a shelf that has more than 20 stories (story S1-E1-03).
 *
 * The rule (DoD; CLAUDE.md rule 20): a shelf shows at most 20 stories, then a "View more" card
 * that opens the See all page (S1-E5-09). It is a real link whose visible text is its whole
 * accessible name ("View more · All 54 in Trending"), so voice control users can say what they see
 * (WCAG 2.2, 2.5.3 Label in Name).
 * Board values: 196 by 264 px, a 2 px dashed border, a 52 px plum circle with an arrow, the title
 * in Funnel Display 22 px.
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
      className="flex h-[264px] w-[196px] flex-col items-start justify-center gap-3 rounded-cover border-2 border-dashed border-dashed-border bg-surface p-5 no-underline"
    >
      <span className="inline-flex h-13 w-13 items-center justify-center rounded-full bg-chip-on text-chip-on-text">
        <ArrowRightIcon size={22} />
      </span>
      <span className="font-heading text-[22px] font-bold text-heading">{t('shelf.viewMore')}</span>
      <span className="text-sm text-body">
        {t('shelf.viewMoreHint', { count: totalCount, title: shelfTitle })}
      </span>
    </a>
  );
}
