/**
 * MaybeLink: a link when there is somewhere to go, else the same content as plain words (bundle
 * ATLAS, part i).
 *
 * The map's nodes and the family tree's boxes link to a character's sheet in Story Atlas; on a
 * readers' page they link to the character's public page only while Characters is public
 * (S1-E17-33), and otherwise are just the name.
 * Who uses it: RelationshipMap and FamilyTreeView. What it calls: React Router's Link.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Renders a link or plain content.
 *
 * @param props.to - the address, or null for no link
 * @param props.className - the classes, the same either way so the layout doesn't change
 * @param props.children - what shows
 * @returns a Link or a span
 */
export function MaybeLink({
  to,
  className,
  children,
}: {
  to: string | null;
  className: string;
  children: ReactNode;
}) {
  if (to === null) return <span className={className}>{children}</span>;
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
