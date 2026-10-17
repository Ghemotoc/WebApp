/**
 * LegalDocumentNav: the row of documents at the top of the Legal centre (story S1-E14-01).
 *
 * Board 7.2 draws these as tabs. They are links here, one web address per document, so the
 * sign-up form, Settings and the footer can link straight to "the privacy notice" and the browser's
 * back button works; the current one carries aria-current="page" (board mismatch noted in the pull
 * request). Each looks like a chip: 36 px tall, plum when current with a tick (DoD pill system).
 * Who uses it: LegalCentrePage.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { CheckIcon } from '@/components/icons/CheckIcon';

import { legalDocumentSlugs } from '../lib/legalDocumentList';

/**
 * The classes of one link: white with a plum border, or filled plum when it is the current page.
 *
 * @param isActive - whether this link is the page on screen
 * @returns the class names
 */
function linkClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-4 text-sm leading-none font-semibold no-underline';
  return isActive
    ? `${shared} border-heading bg-heading text-on-primary`
    : `${shared} border-control-border bg-surface text-heading hover:bg-tint`;
}

/**
 * Renders the documents as a wrapping row of links (it never scrolls sideways at 390 px).
 *
 * @returns the navigation
 */
export function LegalDocumentNav() {
  const { t } = useTranslation('legal');
  return (
    <nav aria-label={t('documentsNavLabel')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 rounded-[28px] border border-border bg-surface p-1.5">
        {legalDocumentSlugs.map((slug) => (
          // Each link is 36 px tall, well above the 24 px minimum target (WCAG 2.2, 2.5.8).
          <li key={slug} className="flex">
            <NavLink to={`/legal/${slug}`} className={linkClasses}>
              {({ isActive }) => (
                <>
                  {isActive && <CheckIcon />}
                  {t(`documents.${slug}.tab`)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
