/**
 * SettingSwitchRow: one on and off setting in a member's Settings, drawn as the canvas's Settings
 * board draws it (bundle G11b): the setting's name in bold with its explanation under it, and the
 * switch on the right. It replaces the ticked boxes of S1-E13-01 and S1-E9-04.
 *
 * The switch is the shared SwitchButton (a real button with role="switch", the words On or Off
 * beside the track, so the state never shows by colour alone, WCAG 1.4.1). Its name is the
 * setting's name and the explanation is linked to it with aria-describedby.
 * Who uses it: OnlineStatusSwitch, SuggestMeSwitch, PersonalDetailsSwitch (Privacy) and
 * "Let adults message me" (MessageSettingsSection). What it calls: SwitchButton.
 */
import type { ReactNode } from 'react';

import { SwitchButton } from './SwitchButton';

/** What the row needs. */
export interface SettingSwitchRowProps {
  /** Makes the explanation's id ("privacy-online" → "privacy-online-hint"). */
  id: string;
  label: string;
  hint: string;
  isOn: boolean;
  /** The word beside the track, in the reader's language: "On" or "Off". */
  stateWord: string;
  isDisabled: boolean;
  onToggle: () => void;
  /** Anything that belongs under the row, such as the parent's line under "Suggest me". */
  children?: ReactNode;
}

/**
 * Renders the row.
 *
 * @returns the setting with its switch
 */
export function SettingSwitchRow({
  id,
  label,
  hint,
  isOn,
  stateWord,
  isDisabled,
  onToggle,
  children,
}: SettingSwitchRowProps) {
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-4">
        {/* The words: the setting's name, and under it what it does. */}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold text-heading">{label}</span>
          <p id={hintId} className="m-0 text-[13px] text-meta">
            {hint}
          </p>
        </div>
        <SwitchButton
          label={label}
          isOn={isOn}
          stateWord={stateWord}
          isDisabled={isDisabled}
          onToggle={onToggle}
          describedBy={hintId}
        />
      </div>
      {children}
    </div>
  );
}
