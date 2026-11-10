/**
 * HubTools: four shortcuts on the Writers' hub, as glass tiles in two columns (bundle G9 WRITING,
 * part a; board WritersHub, "Your tools": Story Atlas, Cover in Canva, Word goals and Export).
 *
 * The board's Canva tile needs a story (Canva starts from a story's settings) and word goals don't
 * exist yet, so the tiles are Story Atlas, the writer dashboard, Download stories (the board's
 * Export) and the Help centre (docs/board-fixes.md). The eyebrow says "Tools" (COPY-1: no "your").
 * Who shows it: WritersHubPage. What it calls: react-router's Link and the line icons.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';

import { useHubTranslation } from '../registerHubTranslations';

/** One tile: where it goes, its locale keys and its decorative icon. */
interface HubTool {
  href: string;
  key: 'atlas' | 'write' | 'download' | 'help';
  icon: ReactNode;
}

/** The four tiles, in the board's order. */
const hubTools: HubTool[] = [
  { href: '/plan', key: 'atlas', icon: <ActionIcon name="book" size={22} /> },
  { href: '/write', key: 'write', icon: <ActionIcon name="pen" size={22} /> },
  {
    href: '/settings#download-my-stories',
    key: 'download',
    icon: <ArrowDownIcon size={22} />,
  },
  { href: '/help', key: 'help', icon: <ActionIcon name="info" size={22} /> },
];

/**
 * Renders the tiles under their eyebrow heading.
 *
 * @returns the section
 */
export function HubTools() {
  const { t } = useHubTranslation();
  return (
    <section aria-labelledby="hub-tools" className="flex flex-col gap-4">
      <h2 id="hub-tools" className="eyebrow m-0">
        {t('hub.tools.eyebrow')}
      </h2>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
        {hubTools.map((tool) => (
          <li key={tool.key}>
            <Link
              to={tool.href}
              className="flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-5 text-ink no-underline shadow-card hover:bg-tint"
            >
              <span className="text-heading">{tool.icon}</span>
              <span className="font-heading text-[19px] font-bold text-heading">
                {t(`hub.tools.${tool.key}Title`)}
              </span>
              <span className="text-sm text-meta">{t(`hub.tools.${tool.key}Line`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
