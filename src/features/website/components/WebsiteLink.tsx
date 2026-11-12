/**
 * WebsiteLink: a link that keeps the reader's country and language (bundle LOCALISE-1).
 *
 * On a website page at "/se/sv/…", a link to "/help/reporting" goes to "/se/sv/help/reporting".
 * Links to app pages (Discover, Settings, the Legal centre) and links shown on app pages are left
 * as written; an older website address written there forwards to the reader's place.
 * Who uses it: the help centre and help pages, the home page's bands and footer, and CmsMarkdown
 * for the links staff write in CMS text. What it calls: useWebsiteLink.
 */
import type { ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';

import { useWebsiteLink } from '../hooks/useWebsitePlace';

/** What the link needs: the router link's own props, with a text address. */
type WebsiteLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'to'> & { to: string };

/**
 * Renders the link.
 *
 * @param props.to - the page's own path, such as "/help" or "/discover"
 * @returns the router link
 */
export function WebsiteLink({ to, ...rest }: WebsiteLinkProps) {
  const linkTo = useWebsiteLink();
  return <Link to={linkTo(to)} {...rest} />;
}
