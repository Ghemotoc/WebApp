/**
 * ItemVisibilityControls: "Keep private" and "Readers see it from" on one item of a story's plan
 * (stories S1-E17-32 and S1-E17-35).
 *
 * - "Keep private" (a checkbox): readers never see the item, even when its area is public.
 * - "Readers see it from" (characters, world entries and events only): the chapter a reader must
 *   reach first; "The start" shows it with the rest. A spoiler guard keeps an item from visitors
 *   who aren't signed in, since there is no reading progress to go by.
 * Each change saves at once and says so; a failed save says so in plain words.
 * Who uses it: CharacterSheet, BibleEntryView, BibleSectionRow, TimelineEventItem and the
 * writer's ConnectionsPage. What it calls: usePlanVisibility.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';

import { usePlanVisibility } from '../hooks/usePlanVisibility';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';

/** What the controls need. */
export interface ItemVisibilityControlsProps {
  slug: string;
  itemId: string;
  /** The item's name, so each checkbox says which item it keeps private. */
  itemName: string;
  /** True for characters, entries and events, which can wait for a chapter. */
  allowsGuard: boolean;
}

/** The "Keep private" checkbox, showing the writer's choice while it saves. */
function KeepPrivateBox({
  itemName,
  isPrivate,
  save,
}: {
  itemName: string;
  isPrivate: boolean;
  save: (keepPrivate: boolean) => Promise<void>;
}) {
  const { t } = useAtlasTranslation();
  const [pending, setPending] = useState<boolean | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  /** Saves the tick; the box shows the choice until the save answers. */
  async function tick(checked: boolean) {
    setHasFailed(false);
    setPending(checked);
    await save(checked).catch(() => setHasFailed(true));
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-heading">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={pending ?? isPrivate}
          onChange={(changed) => void tick(changed.target.checked)}
        />
        {/* Seen: "Keep private"; heard: "Keep private: <the item>". */}
        <span aria-hidden="true">{t('readers.item.keepPrivate')}</span>
        <span className="sr-only">{t('readers.item.keepPrivateNamed', { name: itemName })}</span>
      </label>
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('readers.item.saveFailed')}</Notice>}
      </div>
    </div>
  );
}

/**
 * Renders the controls, once the switches have loaded.
 *
 * @returns the checkbox and, where it applies, the chapter drop-down
 */
export function ItemVisibilityControls({
  slug,
  itemId,
  itemName,
  allowsGuard,
}: ItemVisibilityControlsProps) {
  const { t } = useAtlasTranslation();
  const { visibility, savePrivacy, saveShowFrom } = usePlanVisibility(slug);
  if (!visibility) return null;
  const item = visibility.items[itemId] ?? { isPrivate: false, showFrom: null };
  const chapterOptions = [
    { value: '', label: t('readers.item.fromStart') },
    ...visibility.chapters.map((chapter) => ({
      value: chapter.code,
      label: t('readers.item.chapterOption', { number: chapter.position, title: chapter.title }),
    })),
  ];
  return (
    <div
      role="group"
      aria-label={t('readers.item.groupLabel', { name: itemName })}
      className="flex flex-wrap items-start gap-x-6 gap-y-2"
      data-testid="atlas-item-visibility"
    >
      <KeepPrivateBox
        itemName={itemName}
        isPrivate={item.isPrivate}
        save={async (keepPrivate) => savePrivacy(itemId, keepPrivate)}
      />
      {allowsGuard && !item.isPrivate && (
        <PlanSelectField
          id={`atlas-show-from-${itemId}`}
          label={t('readers.item.showFrom')}
          options={chapterOptions}
          savedValue={item.showFrom ?? ''}
          save={async (chapterCode) => saveShowFrom(itemId, chapterCode)}
        />
      )}
    </div>
  );
}
