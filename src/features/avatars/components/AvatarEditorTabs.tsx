/**
 * AvatarEditorTabs: the avatar editor's tabs (Face, Hair, Glasses and earrings), each with its
 * parts as picture tiles or colour swatches, and the background colour at the bottom whichever
 * tab is open (bundle AVATAR-1; Robert, 6 Nov 2026, 11:04 UTC: "much easier to do, not with
 * dropdowns ... like an avatar editor"; 7 Nov 2026: no clothes tab, "at the end, you should have
 * the option to change the background colour").
 *
 * Which parts sit on which tab, which sit under the tabs, and whether each is a shape or a colour,
 * comes from avatarTabs, avatarPartsUnderTabs and avatarColourParts in lib/avatarOptions.ts, so
 * adding a part there adds it here.
 * Who shows it: AvatarBuilderSection. What it calls: Tabs, AvatarPartTiles, AvatarColourSwatches.
 */
import { useState } from 'react';

import { Tabs } from '@/components/ui/Tabs';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import {
  avatarColourParts,
  avatarPartsUnderTabs,
  avatarTabs,
  type AvatarColourPart,
  type AvatarPart,
  type AvatarTabKey,
} from '../lib/avatarOptions';
import { useAvatarsTranslation } from '../registerAvatarTranslations';

import { AvatarColourSwatches } from './AvatarColourSwatches';
import { AvatarPartTiles } from './AvatarPartTiles';

/** What the editor needs. */
export interface AvatarEditorTabsProps {
  draft: AvatarRecipe;
  onChoose: (part: AvatarPart, value: string) => void;
}

/**
 * True for a part chosen with swatches rather than tiles.
 *
 * @returns whether the part is a colour
 */
function isColourPart(part: AvatarPart): part is AvatarColourPart {
  return (avatarColourParts as readonly string[]).includes(part);
}

/**
 * Renders the tabs, the chosen tab's parts and, below them, the parts every tab shares.
 *
 * @returns the editor
 */
export function AvatarEditorTabs({ draft, onChoose }: AvatarEditorTabsProps) {
  const { t } = useAvatarsTranslation();
  const [tabKey, setTabKey] = useState<AvatarTabKey>('face');
  const tab = avatarTabs.find((candidate) => candidate.key === tabKey) ?? avatarTabs[0];
  return (
    <div className="flex flex-col gap-5">
      {/* Step 1: the tabs, and the open tab's tiles and swatches. */}
      <Tabs
        label={t('builder.tabsLabel')}
        idPrefix="avatar-editor"
        tabs={avatarTabs.map((candidate) => ({
          key: candidate.key,
          label: t(`builder.tabs.${candidate.key}`),
        }))}
        selected={tab.key}
        onSelect={setTabKey}
      >
        <div className="flex flex-col gap-5">
          {tab.parts.map((part) =>
            isColourPart(part) ? (
              <AvatarColourSwatches key={part} part={part} draft={draft} onChoose={onChoose} />
            ) : (
              <AvatarPartTiles key={part} part={part} draft={draft} onChoose={onChoose} />
            ),
          )}
        </div>
      </Tabs>
      {/* Step 2: the background colour, outside the tabs so it stays put whichever tab is open. */}
      <div className="flex flex-col gap-5 border-t border-border pt-4">
        {avatarPartsUnderTabs.map((part) => (
          <AvatarColourSwatches key={part} part={part} draft={draft} onChoose={onChoose} />
        ))}
      </div>
    </div>
  );
}
