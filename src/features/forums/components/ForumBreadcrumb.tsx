/**
 * ForumBreadcrumb: "Forums › Writing craft › First chapters", every step but the last a link
 * (bundle FORUMS-1, parts a and b; S1-E8-01, S1-E8-02; boards 5.1 and 5.2).
 *
 * Who uses it: ForumPage (the last step is the forum), NewThreadPage and ThreadPage (every forum
 * step is a link and the last step is the page's own name). A thread in a space (FORUMS-2a,
 * S1-E8-06) shows "Forums › Spaces › the space › the thread" instead, because a space's forum
 * has no place in the forum index.
 */
import { Link } from 'react-router';

import type { ForumEntry } from '../api/forumIndex';
import type { ForumThreadSpace } from '../api/forumThreads';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the breadcrumb needs. */
export interface ForumBreadcrumbProps {
  /** The forums from the category down. */
  path: ForumEntry[];
  /** The page's own name after the forums (a thread's title); without it the last forum is current. */
  current?: string;
  /** The space the page belongs to; when given, it takes the forums' place (FORUMS-2a). */
  space?: ForumThreadSpace | null;
}

/** The link style every step shares. */
const stepLink = 'inline-flex min-h-6 items-center text-link underline';

/** One linked step: its key, where it goes and its name. */
interface BreadcrumbStep {
  key: string;
  address: string;
  name: string;
}

/**
 * The steps that are links: the space's two steps for a page in a space, else the forums above.
 *
 * @param props - the breadcrumb's path, current name and space
 * @param spacesName - "Spaces", in the reader's language
 * @returns the steps, in order
 */
function linkedSteps(props: ForumBreadcrumbProps, spacesName: string): BreadcrumbStep[] {
  const space = props.space ?? null;
  if (space !== null)
    return [
      { key: 'spaces', address: '/spaces', name: spacesName },
      { key: space.slug, address: `/spaces/${space.slug}`, name: space.name },
    ];
  // Without a current name the last forum is the page itself, so it is not a link.
  const forums = props.current === undefined ? props.path.slice(0, -1) : props.path;
  return forums.map((step) => ({ key: step.id, address: `/forums/${step.slug}`, name: step.name }));
}

/**
 * Renders the breadcrumb.
 *
 * @returns the navigation landmark named "Where you are"
 */
export function ForumBreadcrumb({ path, current, space = null }: ForumBreadcrumbProps) {
  const { t } = useForumsTranslation();
  const linked = linkedSteps({ path, current, space }, t('space.spaces'));
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
          <li key={step.key} className="flex items-center gap-2">
            <span aria-hidden="true">›</span>
            <Link to={step.address} className={stepLink}>
              {step.name}
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">›</span>
          <span aria-current="page" className="min-w-0 [overflow-wrap:anywhere]">
            {currentName}
          </span>
        </li>
      </ol>
    </nav>
  );
}
