/**
 * useReaderSummary: the short hint beside "What readers see" on a folded character sheet card
 * (CALM-9, board E23: "What readers see (a summary of what is shared)").
 *
 * Who calls it: ReaderVisibilitySection. What it calls: usePlanVisibility (the same cached read
 * the card's own controls use, so it adds no load) and the atlas words.
 */
import { sheetParts } from '../api/readerView';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { usePlanVisibility } from './usePlanVisibility';

/**
 * Says in a few words what readers see of one character.
 *
 * @param slug - the story's address
 * @param characterId - the character
 * @returns "Kept private", "No parts of the sheet shared" or "Shared: Basics, Inside"; undefined
 *   while the settings load
 */
export function useReaderSummary(slug: string, characterId: string): string | undefined {
  const { t } = useAtlasTranslation();
  const { visibility } = usePlanVisibility(slug);
  // Step 1: nothing to say until the settings have loaded.
  if (!visibility) return undefined;
  // Step 2: a character kept private shows readers nothing.
  if (visibility.items[characterId]?.isPrivate === true) return t('readers.summary.private');
  // Step 3: otherwise name the built-in parts that are open; the writer's own details count too.
  const openParts = visibility.sheetParts[characterId] ?? [];
  if (openParts.length === 0) return t('readers.summary.none');
  const builtInNames = openParts
    .filter((part) => (sheetParts as readonly string[]).includes(part))
    .map((part) => t(`readers.parts.${part}`));
  const names = [...builtInNames];
  // The writer's own details are counted, not named, so the hint stays short.
  const ownCount = openParts.length - builtInNames.length;
  if (ownCount > 0) names.push(t('readers.summary.ownDetails', { count: ownCount }));
  return t('readers.summary.shared', { parts: names.join(', ') });
}
