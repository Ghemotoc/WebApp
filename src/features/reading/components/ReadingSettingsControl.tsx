/**
 * ReadingSettingsControl: Aa, the chapter bar's "Reading settings" button (story S1-E4-02; the
 * simplified design, bundle CALM-5; design system FocusBar).
 *
 * A round 44 px quiet button with a bold "Aa", named "Reading settings" (the "Aa" is hidden from
 * screen readers). It doesn't hold the panel any more: since CALM-5 the settings open at the top
 * of the reader's side column from 1280 px, or in the reader's bottom sheet below that, so the
 * reader page keeps whether they are open (only one of Reading settings and a paragraph's
 * comments is open at a time; handover Step 4, point 8). aria-expanded says whether they are
 * open, and aria-controls names the panel while it is. The button carries a fixed id, so closing
 * the panel can give it focus back. Only signed-in readers see it: settings are saved to the
 * account.
 * Who uses it: ChapterBar. What it calls: nothing; it reports presses upwards.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** The button's id, which ReaderToolPlace gives focus back to when the panel closes. */
export const readingSettingsButtonId = 'reading-settings-button';

/** The panel's id, which aria-controls names while it is open. */
export const readingSettingsPanelId = 'reading-settings-panel';

/** What the button needs. */
export interface ReadingSettingsControlProps {
  /** True while Reading settings are open. */
  isOpen: boolean;
  /** Opens them, or closes them when they are open. */
  onToggle: () => void;
}

/**
 * Renders the button.
 *
 * @returns Aa
 */
export function ReadingSettingsControl({ isOpen, onToggle }: ReadingSettingsControlProps) {
  const { t } = useTranslation('reading');
  return (
    <button
      id={readingSettingsButtonId}
      type="button"
      aria-label={t('settings.button')}
      aria-expanded={isOpen}
      aria-controls={isOpen ? readingSettingsPanelId : undefined}
      onClick={onToggle}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full font-heading type-long leading-none font-bold',
        isOpen ? 'bg-tint text-ink-heading' : 'text-ink-heading hover:bg-tint',
      )}
    >
      <span aria-hidden="true">{t('settings.buttonSample')}</span>
    </button>
  );
}
