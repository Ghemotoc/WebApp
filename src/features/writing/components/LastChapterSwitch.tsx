/**
 * LastChapterSwitch: "This is the last chapter" in the Publish panel (bundle CALM-6; design
 * handover "The last chapter", points 10 to 13; DS v19, Sheet and FocusBar).
 *
 * The shared Switch with its label on the left and the hint under it: "Readers see “of 15”, and
 * the story turns Completed when this chapter is out." The hint is the switch's description
 * (aria-describedby), so a screen reader hears it after the name.
 * Who uses it: PublishPanel (a draft, a scheduled chapter, and the latest published one).
 * What it calls: Switch; the panel decides what a press does.
 */
import { useId } from 'react';

import { Switch } from '@/components/ui/Switch';

import { useEditorTranslation } from '../registerEditorTranslations';

/** What the switch needs. */
export interface LastChapterSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  /** This chapter's number as readers will see it, for the hint. */
  number: number;
  isDisabled?: boolean;
}

/**
 * Renders the switch and its hint.
 *
 * @returns the row
 */
export function LastChapterSwitch({
  isOn,
  onToggle,
  number,
  isDisabled = false,
}: LastChapterSwitchProps) {
  const { t } = useEditorTranslation();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        {/* The visible label; the switch carries the same words as its accessible name. */}
        <span aria-hidden="true" className="text-[15px] text-ink">
          {t('publish.lastSwitch')}
        </span>
        <Switch
          label={t('publish.lastSwitch')}
          isOn={isOn}
          onToggle={onToggle}
          isDisabled={isDisabled}
          describedBy={hintId}
        />
      </div>
      <p id={hintId} className="m-0 text-[13px] leading-normal text-meta">
        {t('publish.lastHint', { number })}
      </p>
    </div>
  );
}
