/**
 * SpaceToolLinks: the links to running a space, for whoever may use each: "Space settings" (the
 * settings power, or appointing moderators), "Members" (the members power) and "Moderation log"
 * (the owner and our moderation team) (bundle FORUMS-2, parts a and b; S1-E8-06 and S1-E8-07).
 *
 * Hiding a link is a convenience; each page and the database check again (architecture 1.8.1).
 * Who shows it: SpaceHeaderCard. What it calls: nothing; the space says what the reader may do.
 */
import { Link } from 'react-router';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The pill-shaped link style, as the board's header buttons. */
const toolLink =
  'inline-flex h-12 items-center rounded-full button-glass px-5 text-[15px] font-semibold no-underline';

/** One link: where it goes and its words' key. */
interface ToolLink {
  to: string;
  labelKey: string;
}

/**
 * The links the reader may use.
 *
 * @param space - the space
 * @returns the links, in the order shown
 */
function toolLinksFor(space: Space): ToolLink[] {
  const { viewer, slug } = space;
  const links: ToolLink[] = [];
  if (viewer.canManage || viewer.canAppoint)
    links.push({ to: `/spaces/${slug}/settings`, labelKey: 'space.settings' });
  if (viewer.powers.includes('members'))
    links.push({ to: `/spaces/${slug}/members`, labelKey: 'space.membersLink' });
  if (viewer.canReadLog) links.push({ to: `/spaces/${slug}/log`, labelKey: 'space.logLink' });
  return links;
}

/**
 * Renders the links.
 *
 * @param props.space - the space
 * @returns the links, or nothing for a reader who runs nothing here
 */
export function SpaceToolLinks({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const links = toolLinksFor(space);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className={toolLink}>
          {t(link.labelKey)}
        </Link>
      ))}
    </div>
  );
}
