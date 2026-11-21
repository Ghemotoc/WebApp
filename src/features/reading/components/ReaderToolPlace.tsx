/**
 * ReaderToolPlace: where Reading settings open (story S1-E4-02; bundle CALM-5, design handover
 * Step 4, "Reading settings", point 8; boards New-Reader and New-PhoneReader).
 *
 * From 1280 px the panel opens at the top of the reader's side column, above About this story;
 * below that it opens in the reader's bottom sheet. Either way it is closed by default, opens
 * from Aa, closes with × or Escape, and closing gives focus back to Aa. The panel's file loads
 * only when it is first opened, so the reader keeps within its 40 KB script budget (S1-E4-01b,
 * e2e/reader-performance.spec.ts).
 * Who uses it: ChapterReading (narrow) and ReaderSideColumn (wide).
 * What it calls: ReadingSettingsPanel (lazy) and ReaderSheet.
 */
import { lazy, Suspense, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ReaderSheet } from './ReaderSheet';
import { readingSettingsButtonId, readingSettingsPanelId } from './ReadingSettingsControl';

const ReadingSettingsPanel = lazy(async () => {
  const panelModule = await import('./ReadingSettingsPanel');
  return { default: panelModule.ReadingSettingsPanel };
});

/** What the place needs. */
export interface ReaderToolPlaceProps {
  /** True in the side column (from 1280 px); false in the bottom sheet. */
  isInSideColumn: boolean;
  /** The text size that follows the device, for the slider. */
  deviceSize: number;
  /** The open chapter, for its theme (IDEAS-1 part a). */
  chapterCode: string;
  /** Closes the panel; focus goes back to Aa here. */
  onClose: () => void;
}

/**
 * Closes the panel and gives focus back to Aa, which stays on the page (WCAG 2.4.3).
 *
 * @param onClose - what closes the panel
 * @returns the function to call
 */
function useCloseAndReturn(onClose: () => void) {
  return useCallback(() => {
    onClose();
    document.getElementById(readingSettingsButtonId)?.focus();
  }, [onClose]);
}

/**
 * Escape closes the panel in the side column (the sheet does it itself, as a dialog).
 *
 * @param isActive - true in the side column
 * @param close - closes and gives focus back
 */
function useEscapeCloses(isActive: boolean, close: () => void) {
  useEffect(() => {
    if (!isActive) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isActive, close]);
}

/**
 * Renders the open panel in its place.
 *
 * @returns the panel, in the side column or the sheet
 */
export function ReaderToolPlace(props: ReaderToolPlaceProps) {
  const { t } = useTranslation('reading');
  const close = useCloseAndReturn(props.onClose);
  useEscapeCloses(props.isInSideColumn, close);
  // While the panel's file loads, an empty stand-in carries its id, so Aa's aria-controls never
  // points at nothing (axe: aria-valid-attr-value).
  const panel = (
    <Suspense fallback={<div id={readingSettingsPanelId} hidden />}>
      <ReadingSettingsPanel
        id={readingSettingsPanelId}
        deviceSize={props.deviceSize}
        chapterCode={props.chapterCode}
        onClose={close}
        isInSheet={!props.isInSideColumn}
      />
    </Suspense>
  );
  if (props.isInSideColumn) return panel;
  return (
    <ReaderSheet label={t('settings.title')} onClose={close}>
      {panel}
    </ReaderSheet>
  );
}
