/**
 * HubTools: "Tools" on the Writers' hub (bundle G9 WRITING; since user story 1.3 drawn as plain
 * rows in the side column, board A03-WritersHub).
 *
 * Story Atlas, Writing (stories, drafts and statistics), Export (the Word, PDF and EPUB copies)
 * and the Help centre, each a title with one line under it.
 * Who shows it: WritersHubPage. What it calls: HubRows.
 */
import { useHubTranslation } from '../registerHubTranslations';

import { HubRows, type HubRow } from './HubRows';

/** One tool: where it goes and its locale key. */
interface HubTool {
  href: string;
  key: 'atlas' | 'write' | 'download' | 'help';
}

/** The tools, in the board's order. */
const hubTools: HubTool[] = [
  { href: '/plan', key: 'atlas' },
  { href: '/write', key: 'write' },
  { href: '/settings#download-my-stories', key: 'download' },
  { href: '/help', key: 'help' },
];

/**
 * Renders the tools.
 *
 * @returns the section
 */
export function HubTools() {
  const { t } = useHubTranslation();
  const rows: HubRow[] = hubTools.map((tool) => ({
    key: tool.key,
    title: t(`hub.tools.${tool.key}Title`),
    href: tool.href,
    facts: [{ text: t(`hub.tools.${tool.key}Line`) }],
  }));
  return <HubRows headingId="hub-tools" heading={t('hub.tools.eyebrow')} rows={rows} />;
}
