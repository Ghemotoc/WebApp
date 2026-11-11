/**
 * SeasonalLooksTab: Staff › Website › Seasonal looks, where the owner and admins plan which days
 * each seasonal look shows (bundle G12a; the canvas's StaffWebsiteSeasonal board).
 *
 * A glass card lists the four looks in calendar order with their days ("1 Dec to 29 Feb · every
 * year") and a Change button; the card beside it changes one look's days. Members only see a
 * seasonal look if they turned seasonal looks on in Settings › Appearance (bundle G2). Before
 * saving, the page checks that no day sits in two looks; the database checks it again.
 * Who shows it: WebsiteAdminPage at /staff/website/seasonal. What it calls: useSeasonalWindows,
 * useSaveSeasonalWindows, SeasonalWindowForm and the sums in lib/seasonalWindows.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { SeasonalLook, SeasonalWindow } from '@/lib/looks';

import { SeasonalSaveError } from '../../api/staff/seasonalLooks';
import { useSaveSeasonalWindows, useSeasonalWindows } from '../../hooks/useSeasonalLooks';
import { formatMonthDay, windowsOverlap } from '../../lib/seasonalWindows';

import { SeasonalWindowForm } from './SeasonalWindowForm';

/** What the page says after a save: nothing yet, saved, or a failure word. */
type SaveMessage = { kind: 'none' } | { kind: 'saved' } | { kind: 'failed'; failure: string };

/**
 * One look in the list: its name, its days and Change.
 *
 * @returns a list item
 */
function WindowRow({ window, onChange }: { window: SeasonalWindow; onChange: () => void }) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const days = t('seasonal.days', {
    from: formatMonthDay(window.from, i18n.language),
    to: formatMonthDay(window.to, i18n.language),
  });
  const name = t(`seasonal.looks.${window.look}`);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex flex-col">
        <b className="text-heading">{name}</b>
        <span className="text-sm text-meta">{days}</span>
      </span>
      <Button
        type="button"
        variant="secondary"
        aria-label={t('seasonal.changeLabel', { name })}
        onClick={onChange}
      >
        {t('seasonal.change')}
      </Button>
    </li>
  );
}

/**
 * The four looks in calendar order, each with its days and Change.
 *
 * @returns the list card
 */
function WindowList({
  windows,
  onChange,
}: {
  windows: readonly SeasonalWindow[];
  onChange: (look: SeasonalLook) => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <section
      aria-labelledby="seasonal-list-heading"
      className="flex min-w-0 flex-[999_1_420px] flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="seasonal-list-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('seasonal.listHeading')}
      </h2>
      <ul className="m-0 list-none p-0">
        {windows.map((window) => (
          <WindowRow key={window.look} window={window} onChange={() => onChange(window.look)} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Works out what to save: the windows with one look's days replaced, or a failure word when two
 * looks would share a day.
 *
 * @returns the windows to save, or the reason not to
 */
function changedWindows(
  windows: readonly SeasonalWindow[],
  changed: SeasonalWindow,
): SeasonalWindow[] | 'overlap' {
  const next = windows.map((window) => (window.look === changed.look ? changed : window));
  return windowsOverlap(next) ? 'overlap' : next;
}

/**
 * Renders the tab.
 *
 * @returns the list, the form and the messages
 */
export function SeasonalLooksTab() {
  const { t } = useTranslation('websiteAdmin');
  const windows = useSeasonalWindows();
  const save = useSaveSeasonalWindows();
  const [editing, setEditing] = useState<SeasonalLook | null>(null);
  const [message, setMessage] = useState<SaveMessage>({ kind: 'none' });

  // Step 1: the saved windows must load first.
  if (windows.isError) return <Notice tone="error">{t('failures.unreachable')}</Notice>;
  if (windows.isPending) return null;
  const editedWindow = windows.data.find((window) => window.look === editing);

  /** Checks the change on this device, then saves it. */
  function saveWindow(changed: SeasonalWindow) {
    const next = changedWindows(windows.data ?? [], changed);
    if (next === 'overlap') {
      setMessage({ kind: 'failed', failure: 'overlap' });
      return;
    }
    save.mutate(next, {
      onSuccess: () => {
        setEditing(null);
        setMessage({ kind: 'saved' });
      },
      onError: (error) => {
        const failure = error instanceof SeasonalSaveError ? error.failure : 'unreachable';
        setMessage({ kind: 'failed', failure });
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-[760px] text-body">{t('seasonal.intro')}</p>
      {message.kind === 'saved' && <Notice tone="success">{t('seasonal.saved')}</Notice>}
      {message.kind === 'failed' && (
        <Notice tone="error">{t(`seasonal.failures.${message.failure}`)}</Notice>
      )}
      <div className="flex flex-wrap items-start gap-6">
        <WindowList
          windows={windows.data}
          onChange={(look) => {
            setMessage({ kind: 'none' });
            setEditing(look);
          }}
        />
        {editedWindow !== undefined && (
          <div className="flex min-w-0 flex-[1_1_320px] flex-col">
            <SeasonalWindowForm
              key={editedWindow.look}
              window={editedWindow}
              isSaving={save.isPending}
              onCancel={() => setEditing(null)}
              onSave={saveWindow}
            />
          </div>
        )}
      </div>
    </div>
  );
}
