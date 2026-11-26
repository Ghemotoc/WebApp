/**
 * NotFoundPage: "We can't find that page", for any address the app doesn't know (story S1-E2-QA,
 * from Robert's staging check, 17 Oct 2026; redrawn in bundle 10, board J29).
 *
 * As on the board: one centred card (NoticeCard) with the heading, one line and two ways on. The
 * main button, "Go to Read", comes first and the quiet "Search {{productName}}" second (the board
 * draws Search first; the DoD puts a row's main button first, ButtonRow, so the decision wins and
 * the mismatch is in docs/board-fixes.md). No orb and no "Error 404" eyebrow since bundle 10.
 * Who shows it: the router's catch-all route (src/app/router.tsx).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { SearchIcon } from '@/components/icons/SearchIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { brand } from '@/config/brand';

/**
 * Renders the page.
 *
 * @returns the "page not found" card
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <NoticeCard
      heading={t('notFound.heading')}
      headingId="not-found-heading"
      documentTitle={t('notFound.documentTitle')}
    >
      <p className="m-0 type-body text-ink-muted">{t('notFound.body')}</p>
      {/* The main way on first, then the quiet search, both on the left (ButtonRow rule). */}
      <div className="flex flex-wrap gap-3">
        <Link to="/discover" className={buttonClassName({ size: 'lg' })}>
          {t('notFound.goDiscover')}
        </Link>
        <Link to="/search" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
          <SearchIcon size={18} />
          {t('notFound.search', { productName: brand.productName })}
        </Link>
      </div>
    </NoticeCard>
  );
}
