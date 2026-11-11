/**
 * SupportBackLink: the small "‹ Settings" or "‹ Support requests" link at the top of the support
 * pages, as the canvas's Support boards draw it (bundle G11c).
 *
 * A real link (keyboard, new tab, Back all work), at least 44 px tall (CLAUDE.md rule 9).
 * Who shows it: MySupportPage, NewSupportRequestPage and MySupportTicketPage.
 * What it calls: React Router's Link.
 */
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';

/** What the link needs. */
export interface SupportBackLinkProps {
  /** Where it goes, for example "/settings#support". */
  to: string;
  /** The words, the name of the page it goes back to. */
  label: string;
}

/**
 * Renders the link.
 *
 * @returns the link
 */
export function SupportBackLink({ to, label }: SupportBackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-heading no-underline hover:underline"
    >
      <ChevronLeftIcon />
      {label}
    </Link>
  );
}
