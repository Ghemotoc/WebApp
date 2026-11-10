/**
 * SpaceBreadcrumb: "Forums › Spaces › Fantasy writers' circle", every step but the last a link
 * (bundle FORUMS-2, part a; S1-E8-06; the board's breadcrumb).
 * Who uses it: SpacePage, NewSpacePage, SpaceSettingsPage and SpaceNewThreadPage.
 */
import { Link } from 'react-router';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the breadcrumb needs. */
interface SpaceBreadcrumbProps {
  /** The space between "Spaces" and the page, as a link (the settings and new-thread pages). */
  space?: { slug: string; name: string };
  /** The page's own name, the last step. */
  current: string;
}

/** The link style every step shares. */
const stepLink = 'inline-flex min-h-6 items-center text-link underline';

/**
 * Renders the breadcrumb.
 *
 * @returns the navigation landmark named "Where you are"
 */
export function SpaceBreadcrumb({ space, current }: SpaceBreadcrumbProps) {
  const { t } = useSpacesTranslation();
  return (
    <nav aria-label={t('space.breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-body">
        <li>
          <Link to="/forums" className={stepLink}>
            {t('space.forums')}
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">›</span>
          <Link to="/spaces" className={stepLink}>
            {t('title')}
          </Link>
        </li>
        {space !== undefined && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true">›</span>
            <Link to={`/spaces/${space.slug}`} className={stepLink}>
              {space.name}
            </Link>
          </li>
        )}
        <li className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">›</span>
          <span aria-current="page" className="min-w-0 [overflow-wrap:anywhere]">
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
