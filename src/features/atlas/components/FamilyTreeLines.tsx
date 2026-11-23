/**
 * FamilyTreeLines: the family tree's lines (story S1-E17-16; CALM-9, board E26: "lines 2 px in
 * the muted ink colour").
 *
 * Partners are joined by a straight line at mid-height, children hang from the middle of it,
 * and brothers and sisters share a dashed bracket over their cards. A maker's line ("turned or
 * made") and a cousin's curve are dotted, so they read apart from birth lines by their shape, not
 * by colour. The lines are drawing only and hidden from screen readers, which get the
 * generations as a list.
 * Who uses it: FamilyTreeView. What it calls: nothing; the paths come from
 * lib/familyTreeLayout.ts.
 */
import type { TreeLayout, TreePath } from '../lib/familyTreeLayout';

/** The dash patterns: the sibling bracket (board E26: 4 5) and the dotted maker and cousin lines. */
const bracketDashes = '4 5';
const dottedDashes = '1 5';

/** One set of paths, all in the same style. */
function PathSet({ paths, dashes }: { paths: TreePath[]; dashes?: string }) {
  return (
    <>
      {paths.map(({ key, path }) => (
        <path key={key} d={path} strokeDasharray={dashes} />
      ))}
    </>
  );
}

/**
 * Draws every line of the tree in the muted ink colour, 2 px wide with round ends.
 *
 * @param props.layout - the laid-out tree
 * @returns an SVG under the cards, hidden from screen readers
 */
export function TreeLines({ layout }: { layout: TreeLayout }) {
  return (
    <svg
      aria-hidden="true"
      width={layout.width}
      height={layout.height}
      className="pointer-events-none absolute inset-0 overflow-visible"
      fill="none"
      stroke="var(--meta)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <PathSet paths={layout.partnerPaths} />
      <PathSet paths={layout.childPaths} />
      <PathSet paths={layout.madePaths} dashes={dottedDashes} />
      <PathSet paths={layout.siblingPaths} dashes={bracketDashes} />
      <PathSet paths={layout.cousinPaths} dashes={dottedDashes} />
    </svg>
  );
}
