/**
 * LessMotionRow: the "Less motion" switch in Settings › Appearance, with its name and a line
 * saying what it does (bundle MOTION-1; Robert, 13 Nov 2026; idea IDEA-20261113-12).
 *
 * Why it exists: the app already stays still when the device asks for reduced motion, but many
 * people don't know that setting, and a school or shared computer often can't be changed. The
 * switch gives the same stillness from inside the app (WCAG 2.2, 2.3.3 Animation from
 * Interactions).
 * On a device that already asks for reduced motion the switch shows as on and can't be turned
 * off here: the device's setting always counts, and saying so is more honest than a switch that
 * would do nothing.
 * Who shows it: AppearanceSettingsSection. What it calls: the shared SwitchButton and
 * src/lib/motion.ts; it reports the click upwards.
 */
import { useSyncExternalStore } from 'react';

import { SwitchButton } from '@/features/settings/components/SwitchButton';

import { useAppearanceTranslation } from '../registerAppearanceTranslations';
import { DEVICE_LESS_MOTION_QUERY, deviceAsksForLessMotion } from '@/lib/motion';

/**
 * Listens for the device switching its reduced-motion setting, for useSyncExternalStore.
 *
 * @param listener - called when the setting changes
 * @returns a function that stops listening
 */
function subscribeToDeviceMotion(listener: () => void): () => void {
  // Some test browsers have no matchMedia: nothing to follow.
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(DEVICE_LESS_MOTION_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** What the row needs. */
export interface LessMotionRowProps {
  /** Whether the member turned the switch on. */
  isOn: boolean;
  /** Called when the member clicks the switch. */
  onToggle: () => void;
}

/**
 * Renders the row.
 *
 * @param props.isOn - the member's own choice
 * @param props.onToggle - flips the choice
 * @returns the switch with its name and hint
 */
export function LessMotionRow({ isOn, onToggle }: LessMotionRowProps) {
  const { t } = useAppearanceTranslation();
  // Step 1: follow the device's own setting live, so the row is right the moment it changes.
  const isDeviceAsking = useSyncExternalStore(subscribeToDeviceMotion, deviceAsksForLessMotion);
  // Step 2: the device's setting counts by itself, so the switch shows on and stays put.
  const isShownOn = isOn || isDeviceAsking;
  const hintKey = isDeviceAsking ? 'lessMotionDeviceHint' : 'lessMotionHint';
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-ink">{t('lessMotionLabel')}</span>
        <span id="appearance-less-motion-hint" className="text-[13px] text-meta">
          {t(hintKey)}
        </span>
      </span>
      <SwitchButton
        label={t('lessMotionLabel')}
        isOn={isShownOn}
        stateWord={t(isShownOn ? 'on' : 'off')}
        isDisabled={isDeviceAsking}
        onToggle={onToggle}
        describedBy="appearance-less-motion-hint"
      />
    </div>
  );
}
