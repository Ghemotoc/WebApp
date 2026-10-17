/**
 * Footer: the bottom of every public screen (story S1-E1-03).
 *
 * Board values (Discover and others): a 1 px top line, 14 px meta text, the footer links in a
 * wrapping row, then the "An app by …" line and the drop-downs in a second row.
 * Decisions: the company name comes from the brand config ("An app by {{companyName}}", canvas
 * comment, 16 Oct 2026); the Device / Light / Night drop-down lives here (Robert, 17 Oct 2026);
 * the end slot holds the language drop-down from S1-E1-04. Links appear only when their page
 * exists (src/app/navigation.ts).
 * Who uses it: AppLayout.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { footerNavigation } from '@/app/navigation';
import { PageContainer } from '@/components/ui/PageContainer';
import { ThemeSelect } from '@/features/theme/components/ThemeSelect';

/** What the footer needs. */
export interface FooterProps {
  /** Extra controls beside the theme drop-down, such as the language drop-down. */
  endSlot?: ReactNode;
}

/**
 * Renders the footer.
 *
 * @returns the footer
 */
export function Footer({ endSlot }: FooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="mt-18">
      <PageContainer>
        {/* The top line spans the content column only, as on the boards, not the side padding. */}
        <div className="flex flex-col gap-2 border-t border-border pt-6 pb-10 text-sm text-meta">
          {footerNavigation.length > 0 && (
            <nav aria-label={t('shell.footerNavigation')}>
              <ul className="m-0 flex list-none flex-wrap gap-x-6 p-0">
                {footerNavigation.map((item) => (
                  <li key={item.href}>
                    <Link to={item.href} className="inline-flex min-h-11 items-center text-body">
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="m-0">{t('shell.madeBy')}</p>
            <div className="flex flex-wrap items-center gap-4">
              {endSlot}
              <ThemeSelect />
            </div>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
