/**
 * LegalDocumentNav: the row of documents at the top of the Legal centre (story S1-E14-01).
 *
 * Board J08 (user stories, bundle 10) draws the documents as a tinted track, the current one on a
 * raised white bubble, like the top bar's track. They are links, one web address per document, so
 * the sign-up form, Settings and the footer can link straight to "the privacy notice" and the
 * browser's back button works; the current one carries aria-current="page" and bold text, so it
 * shows by shape and weight, not colour alone (WCAG 2.2, 1.4.1). Each link is 40 px tall (24 px
 * minimum, CLAUDE.md rule 9). On a narrow screen the track scrolls sideways inside its own box
 * (no scrollbar, as everywhere; the links inside take keyboard focus).
 * Who uses it: LegalCentrePage.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { legalDocumentSlugs } from '../lib/legalDocumentList';

/**
 * The classes of one link: plain on the track, or on the white bubble when it is the current page.
 *
 * @param isActive - whether this link is the page on screen
 * @returns the link's classes
 */
function linkClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'inline-flex min-h-10 items-center justify-center rounded-full px-4 type-body whitespace-nowrap no-underline';
  return isActive
    ? `${shared} bg-surface font-semibold text-ink-heading shadow-card`
    : `${shared} font-normal text-ink hover:text-ink-heading`;
}

/**
 * Renders the row.
 *
 * @returns the documents' navigation
 */
export function LegalDocumentNav() {
  const { t } = useTranslation('legal');
  return (
    <nav aria-label={t('documentsNavLabel')} className="max-w-full overflow-x-auto">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-tint p-1">
        {legalDocumentSlugs.map((slug) => (
          <li key={slug} className="flex">
            <NavLink to={`/legal/${slug}`} className={linkClasses}>
              {t(`documents.${slug}.tab`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
