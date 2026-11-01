/**
 * PresenceHeartbeat: draws nothing; while someone is signed in with "Show when I'm online" on, it
 * tells the database once a minute that they have the app open (story S1-E13-01).
 *
 * With the switch off it sends nothing, so nobody's activity is recorded unless they chose it
 * (Q50; GDPR art. 25(2)).
 * Who shows it: AppLayout, once for the whole app. What it calls: usePrivacySettings and
 * useHeartbeat → note_i_am_online().
 */
import { useHeartbeat } from '../hooks/useOnlineStatus';
import { usePrivacySettings } from '../hooks/usePrivacySettings';

/**
 * Runs the heartbeat.
 *
 * @returns nothing to draw
 */
export function PresenceHeartbeat() {
  const settings = usePrivacySettings();
  useHeartbeat(settings.data?.showsOnlineStatus === true);
  return null;
}
