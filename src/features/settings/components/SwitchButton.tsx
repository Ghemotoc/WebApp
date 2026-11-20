/**
 * SwitchButton: an on and off switch, a real button with role="switch" (story S1-E11-03). Since
 * bundle CALM-4 it draws the shared Switch (src/components/ui/Switch.tsx: a 52 × 32 px track, a
 * 26 px knob, primary when on), so every switch in the app looks the same; this keeps the props
 * its callers already pass.
 *
 * The state shows as the knob's place and the words On or Off beside it, never colour alone
 * (WCAG 1.4.1). Who uses it: FlagRow, the Appearance settings
 * section, the "Unread only" switch on the notifications page (G8d) and the switches in
 * Settings › Privacy (PrivacySwitchRow, G11b).
 */
import { Switch } from '@/components/ui/Switch';

/** What the switch needs. */
interface SwitchButtonProps {
  /** The accessible name, for example the flag's label. */
  label: string;
  isOn: boolean;
  /** The word shown beside the track: "On" or "Off". */
  stateWord: string;
  isDisabled: boolean;
  onToggle: () => void;
  /** The id of a line that explains the switch, read after its name (optional). */
  describedBy?: string;
}

/**
 * Renders the switch.
 *
 * @returns the shared Switch with the word beside it
 */
export function SwitchButton(props: SwitchButtonProps) {
  return <Switch {...props} />;
}
