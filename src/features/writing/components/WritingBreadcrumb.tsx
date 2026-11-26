/**
 * WritingBreadcrumb: "Writing / New story" or "Writing / The Salt Mine Choir / Chapters" above a
 * page of the writer's side (boards D02, D03 and D07, bundle 5: the boards' `.crumbs`).
 *
 * Every step but the last is a link in the muted ink, underlined; the last is the page itself,
 * marked aria-current and not a link. The steps sit in a list, so a screen reader hears how many
 * there are; the slashes between them are drawn only.
 * Who shows it: NewStoryPage, ManageChaptersPage, StorySettingsHeader and, for the Languages
 * screens (board D08), LanguagesBreadcrumb. What it calls: nothing.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** One step: its words, and its address unless it is the page itself. */
export interface WritingCrumb {
  label: string;
  to?: string;
  /** The step's language, when it is a title in another language than the interface. */
  lang?: string;
}

/** A linked step: muted and underlined, at least 24 px tall (CLAUDE.md rule 9). */
const crumbLink =
  'hit-target inline-flex min-h-6 items-center text-ink-muted underline underline-offset-2';

/**
 * Renders the breadcrumb.
 *
 * @param props.crumbs - the steps from "Writing" to the page itself
 * @returns the breadcrumb navigation
 */
export function WritingBreadcrumb({ crumbs }: { crumbs: WritingCrumb[] }) {
  const { t } = useTranslation('writing');
  return (
    <nav aria-label={t('breadcrumb.label')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 type-meta">
        {crumbs.map((crumb, index) => (
          <li key={crumb.label} className="flex min-w-0 items-center gap-2">
            {/* The slash before every step but the first. */}
            {index > 0 && <span aria-hidden="true">/</span>}
            {crumb.to === undefined ? (
              <span
                aria-current="page"
                lang={crumb.lang}
                className="min-w-0 [overflow-wrap:anywhere]"
              >
                {crumb.label}
              </span>
            ) : (
              <Link to={crumb.to} lang={crumb.lang} className={crumbLink}>
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
