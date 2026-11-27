/**
 * ThreadMembersOnlyNote: the card under a visitor's first three posts, asking them to get in to
 * read the rest of the thread (GROWTH-4; Robert, 26 Nov 2026, 19:45 UTC: "after the 2nd reply to
 * the poster they need to log in to read the rest").
 *
 * Who shows it: ThreadPage, when forum_thread() answers more_for_members (a visitor who isn't
 * logged in, and the thread has more posts than the opening post and 2 replies). The database
 * never sends the later posts to a visitor, so this card is the whole of what they see after them.
 * What it calls: nothing; its link goes to the sign-in page.
 */
import { Link } from 'react-router';

import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the card.
 *
 * @returns the card with its heading, a line on why and the way in
 */
export function ThreadMembersOnlyNote() {
  const { t } = useForumsTranslation();
  return (
    <section
      aria-labelledby="thread-members-only-title"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card md:p-6"
    >
      <h2
        id="thread-members-only-title"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('thread.membersOnlyTitle')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('thread.membersOnlyBody')}</p>
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center self-start rounded-full button-main px-4 type-body font-semibold no-underline"
      >
        {t('thread.membersOnlyLogIn')}
      </Link>
    </section>
  );
}
