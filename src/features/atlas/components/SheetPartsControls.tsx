/**
 * SheetPartsControls: which parts of one character's sheet readers see (story S1-E17-32: "on
 * character sheets, each group of fields … and each custom field has its own switch, with Inside
 * and notes private by default").
 *
 * One switch (a Chip, pressed = readers see it) for each group of the sheet, one for the notes
 * and one for each of the writer's own fields; each press saves at once. The switches only
 * matter while Characters is public and the character isn't kept private, which the hint says.
 * Who uses it: ReaderVisibilitySection. What it calls: usePlanVisibility.
 */
import { useState } from 'react';

import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';

import type { CharacterField } from '../api/characters';
import { sheetParts } from '../api/readerView';
import { usePlanVisibility } from '../hooks/usePlanVisibility';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the switches need. */
export interface SheetPartsControlsProps {
  slug: string;
  characterId: string;
  /** The writer's own fields; hidden ones get no switch. */
  fields: CharacterField[];
}

/**
 * Renders the switches, once the settings have loaded.
 *
 * @returns the row of switches with its label
 */
export function SheetPartsControls({ slug, characterId, fields }: SheetPartsControlsProps) {
  const { t } = useAtlasTranslation();
  const { visibility, saveParts } = usePlanVisibility(slug);
  // While a press saves, the switches show the writer's choice.
  const [pending, setPending] = useState<string[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  if (!visibility) return null;
  const openParts = pending ?? visibility.sheetParts[characterId] ?? [];

  /** Turns one part on or off and saves the whole list. */
  async function toggle(part: string, isOpen: boolean) {
    const next = isOpen ? [...openParts, part] : openParts.filter((open) => open !== part);
    setHasFailed(false);
    setPending(next);
    await saveParts(characterId, next).catch(() => setHasFailed(true));
    setPending(null);
  }

  const switches = [
    ...sheetParts.map((part) => ({ key: part, label: t(`readers.parts.${part}`) })),
    ...fields
      .filter((field) => !field.isHidden)
      .map((field) => ({ key: field.id, label: field.name })),
  ];
  return (
    <div className="flex flex-col gap-2">
      <p id={`atlas-parts-${characterId}`} className="m-0 text-sm font-semibold text-heading">
        {t('readers.parts.label')}
      </p>
      <div
        role="group"
        aria-labelledby={`atlas-parts-${characterId}`}
        className="flex flex-wrap gap-2"
      >
        {switches.map((part) => (
          <Chip
            key={part.key}
            isPressed={openParts.includes(part.key)}
            onPressedChange={(isOpen) => void toggle(part.key, isOpen)}
          >
            {part.label}
          </Chip>
        ))}
      </div>
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('readers.item.saveFailed')}</Notice>}
      </div>
    </div>
  );
}
