/**
 * NewThreadLink: "New thread", the page's one plum button on Together, or "Get in to post" for a
 * visitor (bundle BOOKS-7, board F01, user story 7.1: "New thread (the one plum button) opens New
 * thread with the forum to pick first. Signed out, it reads Get in to post and opens Get in").
 *
 * Who shows it: ForumsPage's header. What it calls: useSession; the link opens /forums/new
 * (NewThreadPage) or /sign-in.
 */
import { Link } from 'react-router';

import { useSession } from '@/features/auth/hooks/useSession';

import { useForumsTranslation } from '../registerForumsTranslations';

/** The main button's look, as a link. */
const mainLink =
  'inline-flex h-11 items-center rounded-full button-main px-6 type-label font-semibold no-underline';

/**
 * Renders the link.
 *
 * @returns "New thread", "Get in to post", or nothing while the session is unknown
 */
export function NewThreadLink() {
  const { t } = useForumsTranslation();
  const { userId, isKnown } = useSession();
  if (!isKnown) return null;
  if (userId === null) {
    return (
      <Link to="/sign-in" className={mainLink}>
        {t('header.getIn')}
      </Link>
    );
  }
  return (
    <Link to="/forums/new" className={mainLink}>
      {t('header.newThread')}
    </Link>
  );
}
