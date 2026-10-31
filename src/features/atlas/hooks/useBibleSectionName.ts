/**
 * useBibleSectionName: a bible section's name as the writer sees it (story S1-E17-17): their own
 * name when they gave one, otherwise the default section's name in the interface language.
 *
 * Who calls it: the bible's components. What it calls: the "bible.presets" texts in atlas.json.
 */
import type { BibleSection } from '../api/bible';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * The naming function for the current language.
 *
 * @returns a function from a section to its shown name
 */
export function useBibleSectionName(): (section: BibleSection) => string {
  const { t } = useAtlasTranslation();
  return (section) => {
    if (section.name.trim() !== '' || section.preset === null) return section.name;
    return t(`bible.presets.${section.preset}`);
  };
}
