/**
 * CanvaSettingsSection: "Canva" in Settings: whether Canva is connected, and Disconnect (story
 * S1-E3-12: "connecting is optional and the writer can disconnect in Settings").
 *
 * What it shows: "Connected since <date>" with Disconnect, or "Not connected" with where
 * connecting happens. Shown while canva_covers is on, and always while the writer is connected,
 * so a writer can leave even after the switch goes off.
 * Who shows it: SettingsPage. What it calls: useCanvaConnection, useFeatureFlags.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { useCanvaConnection } from '../hooks/useCanvaConnection';

/** The connection's line and its button. */
function ConnectionState({ canva }: { canva: ReturnType<typeof useCanvaConnection> }) {
  const { t, i18n } = useTranslation('writing');
  if (canva.connectedSince === null) {
    return <p className="m-0 text-body">{t('canva.settings.notConnected')}</p>;
  }
  const since = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(
    new Date(canva.connectedSince),
  );
  return (
    <>
      <p className="m-0 text-body">{t('canva.settings.connected', { date: since })}</p>
      {canva.disconnectFailed && (
        <Notice tone="error">{t('canva.settings.disconnectFailed')}</Notice>
      )}
      <div>
        <Button variant="secondary" disabled={canva.isDisconnecting} onClick={canva.disconnect}>
          {t('canva.settings.disconnect')}
        </Button>
      </div>
    </>
  );
}

/**
 * Renders the section, or nothing while it doesn't apply.
 *
 * @returns the section, or null
 */
export function CanvaSettingsSection() {
  const { t } = useTranslation('writing');
  const { isOn } = useFeatureFlags();
  const canva = useCanvaConnection();
  const isShown = isOn('canva_covers', false) || canva.connectedSince !== null;
  if (!isShown || !(canva.isLoaded || canva.loadFailed)) return null;
  return (
    <section
      aria-labelledby="settings-canva-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-canva-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('canva.settings.heading')}
      </h2>
      {canva.loadFailed ? (
        <Notice tone="error">{t('canva.settings.loadFailed')}</Notice>
      ) : (
        <ConnectionState canva={canva} />
      )}
    </section>
  );
}
