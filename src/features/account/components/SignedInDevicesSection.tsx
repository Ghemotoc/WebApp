/**
 * SignedInDevicesSection: Settings › Signed-in devices (story S1-E2-05; board 6.3, as corrected in
 * docs/board-fixes.md: device, last active, Log out, "Log out of all other devices", no IP or
 * location).
 *
 * Where the list comes from: Supabase's own record of sessions, read through list_my_sessions(),
 * which never returns the IP address (decided 17 Oct 2026, 19:43, Q13).
 * Who shows it: SettingsPage. What it calls: hooks/useMySessions.ts.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useMySessions } from '../hooks/useMySessions';

import { DeviceRow } from './DeviceRow';

/**
 * Renders the panel.
 *
 * @returns the Signed-in devices section
 */
export function SignedInDevicesSection() {
  const { t } = useTranslation('account');
  const devices = useMySessions();
  const hasOtherDevices = devices.sessions.some((session) => !session.isCurrent);

  return (
    <section
      aria-labelledby="settings-devices-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="settings-devices-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('devices.heading')}
      </h2>
      <p className="m-0 text-body">{t('devices.body')}</p>
      {devices.loadFailed && <Notice tone="error">{t('devices.loadFailed')}</Notice>}
      <ul className="m-0 flex list-none flex-col p-0">
        {devices.sessions.map((session) => (
          <DeviceRow
            key={session.sessionId}
            session={session}
            isBusy={devices.isBusy}
            onEnd={devices.endOne}
          />
        ))}
      </ul>
      {hasOtherDevices && (
        <Button
          variant="secondary"
          className="self-start"
          disabled={devices.isBusy}
          onClick={devices.endOthers}
        >
          {t('devices.signOutOthers')}
        </Button>
      )}
      {devices.othersEnded && <Notice tone="success">{t('devices.signedOutOthers')}</Notice>}
      {devices.actionFailed && <Notice tone="error">{t('devices.actionFailed')}</Notice>}
      <p className="m-0 text-[13px] text-meta">{t('devices.privacy')}</p>
      <p className="m-0 text-[13px] text-meta">{t('devices.lagNote')}</p>
    </section>
  );
}
