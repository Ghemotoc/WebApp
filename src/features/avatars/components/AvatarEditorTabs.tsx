/**
 * AvatarEditorTabs: the avatar editor's tabs (Face, Hair, Glasses and earrings, Clothes and
 * background), each with its parts as picture tiles or colour swatches (bundle AVATAR-1;
 * Robert, 6 Nov 2026, 11:04 UTC: "much easier to do, not with dropdowns ... like an avatar
 * editor").
 *
 * Which parts sit on which tab, and whether each is a shape or a colour, comes from avatarTabs
 * and avatarColourParts in lib/avatarOptions.ts, so adding a part there adds it here.
 * Who shows it: AvatarBuilderSection. What it calls: Tabs, AvatarPartTiles, AvatarColourSwatches.
 */
import { useState } from 'react';

import { Tabs } from '@/components/ui/Tabs';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import {
  avatarColourParts,
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
 * Renders the tabs and the chosen tab's parts.
 *
 * @returns the editor
 */
export function AvatarEditorTabs({ draft, onChoose }: AvatarEditorTabsProps) {
  const { t } = useAvatarsTranslation();
  const [tabKey, setTabKey] = useState<AvatarTabKey>('face');
  const tab = avatarTabs.find((candidate) => candidate.key === tabKey) ?? avatarTabs[0];
  return (
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
  );
}
