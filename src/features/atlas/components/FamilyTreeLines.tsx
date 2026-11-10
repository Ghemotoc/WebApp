/**
 * FamilyTreeLines: the family tree's lines and the legend that names them (story S1-E17-16;
 * bundle G10 ATLAS, part b2, board AtlasFamilyTree; moved out of FamilyTreeView in GAPS-3 to keep
 * that file short).
 *
 * Each kind of line has its own style, so meaning never rests on colour alone: parent solid
 * (maker dotted, in the lineage colour), sibling dashed, partner double, cousin dotted. The lines
 * are drawing only and hidden from screen readers, which get the generations as a list.
 * Who uses it: FamilyTreeView. What it calls: lib/relationshipCategories.ts for the colours.
 */
import type { TreeLayout } from '../lib/familyTreeLayout';
import { lineStyles } from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** How each kind of family line is drawn (G10b2, board AtlasFamilyTree's legend). */
const treeLines = {
  sibling: '7 5',
  cousin: '1 6',
} as const;

/** The tree's lines: parent solid (maker dotted in the lineage colour), partner double,
 * sibling dashed, cousin dotted. */
export function TreeLines({ layout, madeKeys }: { layout: TreeLayout; madeKeys: Set<string> }) {
  const family = lineStyles.family;
  const lineage = lineStyles.lineage;
  return (
    <svg
      aria-hidden="true"
      width={layout.width}
      height={layout.height}
      className="pointer-events-none absolute inset-0"
    >
      {layout.parentPaths.map(({ key, path }) => {
        const style = madeKeys.has(key) ? lineage : family;
        return (
          <path
            key={key}
            d={path}
            fill="none"
            stroke={style.colour}
            strokeWidth={style.width}
            strokeDasharray={style.dashes}
          />
        );
      })}
      {/* A double line: a wide stroke with a thin gap of the card's colour along its middle. */}
      {layout.partnerPaths.map(({ key, path }) => (
        <g key={key}>
          <path d={path} fill="none" stroke={family.colour} strokeWidth={7} />
          <path d={path} fill="none" stroke="var(--surface)" strokeWidth={2.5} />
        </g>
      ))}
      {layout.siblingPaths.map(({ key, path }) => (
        <path
          key={key}
          d={path}
          fill="none"
          stroke={family.colour}
          strokeWidth={2.5}
          strokeDasharray={treeLines.sibling}
        />
      ))}
      {layout.cousinPaths.map(({ key, path }) => (
        <path
          key={key}
          d={path}
          fill="none"
          stroke={family.colour}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={treeLines.cousin}
        />
      ))}
    </svg>
  );
}

/** One legend entry: a short sample of the line, then its name. */
function LegendLine({
  label,
  dashes,
  isDouble,
}: {
  label: string;
  dashes?: string;
  isDouble?: boolean;
}) {
  const colour = lineStyles.family.colour;
  return (
    <li className="flex items-center gap-2 text-sm text-ink">
      <svg aria-hidden="true" width="32" height="12" viewBox="0 0 32 12" className="shrink-0">
        <line
          x1="2"
          y1="6"
          x2="30"
          y2="6"
          stroke={colour}
          strokeWidth={isDouble ? 7 : 3}
          strokeDasharray={dashes}
          strokeLinecap={dashes === treeLines.cousin ? 'round' : undefined}
        />
        {isDouble && (
          <line x1="2" y1="6" x2="30" y2="6" stroke="var(--surface)" strokeWidth={2.5} />
        )}
      </svg>
      {label}
    </li>
  );
}

/** The legend: parent, sibling, partner and cousin lines. */
export function TreeLegend() {
  const { t } = useAtlasTranslation();
  return (
    <ul
      aria-label={t('connections.tree.legend')}
      className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0"
    >
      <LegendLine label={t('connections.tree.lineParent')} />
      <LegendLine label={t('connections.tree.lineSibling')} dashes={treeLines.sibling} />
      <LegendLine label={t('connections.tree.linePartner')} isDouble />
      <LegendLine label={t('connections.tree.lineCousin')} dashes={treeLines.cousin} />
    </ul>
  );
}
