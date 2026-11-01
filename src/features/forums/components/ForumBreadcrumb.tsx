/**
 * ForumBreadcrumb: "Forums › Writing craft › First chapters", every step but the last a link
 * (bundle FORUMS-1, parts a and b; S1-E8-01, S1-E8-02; boards 5.1 and 5.2).
 *
 * Who uses it: ForumPage (the last step is the forum), NewThreadPage and ThreadPage (every forum
 * step is a link and the last step is the page's own name).
 */
import { Link } from 'react-router';

import type { ForumEntry } from '../api/forumIndex';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the breadcrumb needs. */
export interface ForumBreadcrumbProps {
  /** The forums from the category down. */
  path: ForumEntry[];
  /** The page's own name after the forums (a thread's title); without it the last forum is current. */
  current?: string;
}

/** The link style every step shares. */
const stepLink = 'inline-flex min-h-6 items-center text-link underline';

/**
 * Renders the breadcrumb.
 *
 * @returns the navigation landmark named "Where you are"
 */
export function ForumBreadcrumb({ path, current }: ForumBreadcrumbProps) {
  const { t } = useForumsTranslation();
  const linked = current === undefined ? path.slice(0, -1) : path;
  const currentName = current ?? path.at(-1)?.name;
  return (
    <nav aria-label={t('forum.breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-body">
        <li>
          <Link to="/forums" className={stepLink}>
            {t('title')}
          </Link>
        </li>
        {linked.map((step) => (
          <li key={step.id} className="flex items-center gap-2">
            <span aria-hidden="true">›</span>
            <Link to={`/forums/${step.slug}`} className={stepLink}>
              {step.name}
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">›</span>
          <span aria-current="page" className="break-words">
            {currentName}
          </span>
        </li>
      </ol>
    </nav>
  );
}
