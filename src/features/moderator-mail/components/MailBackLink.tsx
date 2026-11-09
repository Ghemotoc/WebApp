/**
 * MailBackLink: the small "back" link at the top of the moderator mail pages, with the back arrow
 * (boards ModMail, ModMailOne and ModMailNew in the liquid glass redesign, bundle G8c).
 *
 * Who shows it: MyMailPage (back to Settings), MailThreadPage and NewMailPage (back to the list).
 * What it calls: NavIcon.
 */
import { Link } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';

/**
 * Renders the link.
 *
 * @param props.to - where it goes
 * @param props.label - the words, naming the page it goes to
 * @returns the link
 */
export function MailBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-6 w-fit items-center gap-1.5 text-sm font-semibold text-link underline"
    >
      <NavIcon name="back" size={16} />
      {label}
    </Link>
  );
}
