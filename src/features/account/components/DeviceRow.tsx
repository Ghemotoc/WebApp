/**
 * DeviceRow: one signed-in device in Settings › Signed-in devices (story S1-E2-05; board 6.3).
 *
 * Shows "Chrome on Windows", "This device" for the one in use, the last active date and, for any
 * other device, a "Log out" button whose accessible name says which device.
 * Who shows it: SignedInDevicesSection.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import type { MySession } from '@/features/auth/api/sessions';
import { describeDevice } from '@/features/auth/lib/deviceName';
import { formatLegalDate } from '@/features/legal/lib/legalDocumentList';

/** What a row needs. */
interface DeviceRowProps {
  session: MySession;
  isBusy: boolean;
  onEnd: (sessionId: string) => void;
}

/**
 * The device's name in words.
 *
 * @param session - the session
 * @returns "Chrome on Windows", or "A browser" when unknown
 */
function useDeviceLabel(session: MySession): string {
  const { t } = useTranslation('account');
  const { browser, system } = describeDevice(session.userAgent);
  const browserName = browser ?? t('devices.unknownBrowser');
  return system === null ? browserName : t('devices.deviceName', { browser: browserName, system });
}

/**
 * Renders the row.
 *
 * @returns the list item
 */
export function DeviceRow({ session, isBusy, onEnd }: DeviceRowProps) {
  const { t, i18n } = useTranslation('account');
  const label = useDeviceLabel(session);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">{label}</span>
          {session.isCurrent && <InfoPill tone="sage">{t('devices.thisDevice')}</InfoPill>}
        </div>
        <span className="text-[13px] text-meta">
          {t('devices.lastActive', { date: formatLegalDate(session.lastActiveAt, i18n.language) })}
        </span>
      </div>
      {!session.isCurrent && (
        <Button
          variant="secondary"
          disabled={isBusy}
          aria-label={t('devices.signOutLabel', { device: label })}
          onClick={() => onEnd(session.sessionId)}
        >
          {t('devices.signOut')}
        </Button>
      )}
    </li>
  );
}
