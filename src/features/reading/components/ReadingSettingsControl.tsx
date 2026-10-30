/**
 * ReadingSettingsControl: the chapter bar's "Reading settings" button and the panel it opens
 * (story S1-E4-02; board 3.5 Reader).
 *
 * Board values: an outlined 44 px chip with a "T" icon, filled plum while the panel is open
 * (aria-expanded), and the panel 56 px below it. Opening moves focus to the panel's heading;
 * Escape or the close button shuts it and puts focus back on the button, so keyboard and screen
 * reader users never lose their place. Only signed-in readers see it, because the settings are
 * saved to the account (signed-out visitors get the teaser, which has no settings).
 * Who uses it: ChapterBar. What it calls: ReadingSettingsPanel, loaded when first opened.
 */
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { TextSettingsIcon } from './ReaderIcons';

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
 * @returns the control
 */
export function ReadingSettingsControl({ deviceSize }: { deviceSize: number }) {
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
          'inline-flex h-11 items-center gap-2 rounded-full border px-[18px] text-[15px] font-semibold',
          isOpen && 'border-chip-on bg-chip-on text-chip-on-text',
          !isOpen && 'border-control-border bg-surface text-heading hover:bg-tint',
        )}
      >
        <TextSettingsIcon />
        {t('settings.button')}
      </button>
      {isOpen && (
        <Suspense fallback={null}>
          <ReadingSettingsPanel id={panelId} deviceSize={deviceSize} onClose={close} />
        </Suspense>
      )}
    </div>
  );
}
