/**
 * ReadingSettingsControl: the chapter bar's "Reading settings" button and the panel it opens
 * (story S1-E4-02; board 3.5 Reader).
 *
 * Look (bundle G7d; rulebook, "Reader bar"): a glass button with a bold "Aa" and "Reading
 * settings" small underneath, filled in the "on" colour while the panel is open (aria-expanded);
 * the panel opens below it. The "Aa" is hidden from screen readers, so the button's name is
 * just "Reading settings". Opening moves focus to the panel's heading;
 * Escape or the close button shuts it and puts focus back on the button, so keyboard and screen
 * reader users never lose their place. Only signed-in readers see it, because the settings are
 * saved to the account (signed-out visitors get the teaser, which has no settings).
 * Who uses it: ChapterBar. What it calls: ReadingSettingsPanel, loaded when first opened.
 */
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

// The panel loads only when it is first opened, so the reader keeps within its 40 KB script
// budget (S1-E4-01b, e2e/reader-performance.spec.ts).
const ReadingSettingsPanel = lazy(async () => {
  const panelModule = await import('./ReadingSettingsPanel');
  return { default: panelModule.ReadingSettingsPanel };
});

/**
 * Renders the button and, while open, the panel.
 *
 * @param props.deviceSize - the text size that follows the device, for the slider
 * @param props.chapterCode - the open chapter, for its theme (IDEAS-1 part a)
 * @returns the control
 */
export function ReadingSettingsControl({
  deviceSize,
  chapterCode,
}: {
  deviceSize: number;
  chapterCode: string;
}) {
  const { t } = useTranslation('reading');
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Step 1: closing puts focus back on the button.
  const close = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };
  // Step 2: Escape closes the open panel.
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'inline-flex min-h-11 flex-col items-center justify-center rounded-[18px] px-3.5 py-1 leading-none',
          isOpen && 'border border-chip-on bg-chip-on text-chip-on-text',
          !isOpen && 'button-glass text-heading',
        )}
      >
        <span aria-hidden="true" className="font-heading text-[17px] font-bold">
          {t('settings.buttonSample')}
        </span>
        <span className="mt-0.5 text-[11px] font-semibold">{t('settings.button')}</span>
      </button>
      {isOpen && (
        // While the panel's file loads, an empty stand-in carries its id, so aria-controls
        // never points at nothing (axe: aria-valid-attr-value).
        <Suspense fallback={<div id={panelId} hidden />}>
          <ReadingSettingsPanel
            id={panelId}
            deviceSize={deviceSize}
            chapterCode={chapterCode}
            onClose={close}
          />
        </Suspense>
      )}
    </div>
  );
}
