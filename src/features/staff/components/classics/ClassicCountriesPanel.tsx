/**
 * ClassicCountriesPanel: "Where it shows" for one classic, the countries where it is hidden
 * (bundle COUNTRY-1; board S29, Edit details › Where it shows).
 *
 * The same picker writers use (HiddenCountriesPicker), with its own Save button: the change is
 * saved on its own, on every edition, and logged with the list before and after
 * (admin_set_classic_hidden_countries()). Readers there get board B11's page, with no reason.
 * Who shows it: ClassicCard, under its buttons. What it calls: the card's onChange with the
 * 'hiddenCountries' change (useClassics).
 * Plain components, no doodles (staff screens).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { HiddenCountriesPicker } from '@/features/country-block/components/HiddenCountriesPicker';

import type { ClassicWork } from '../../api/classics';
import type { ClassicChange } from '../../hooks/useClassics';

/** What the panel needs. */
export interface ClassicCountriesPanelProps {
  work: ClassicWork;
  isChanging: boolean;
  onChange: (change: ClassicChange) => Promise<unknown>;
}

/** What the last save said: nothing yet, saved or failed. */
type SaveState = 'idle' | 'saved' | 'failed';

/**
 * Renders the panel.
 *
 * @returns the panel
 */
export function ClassicCountriesPanel({ work, isChanging, onChange }: ClassicCountriesPanelProps) {
  const { t } = useTranslation('staff');
  const [hidden, setHidden] = useState<string[]>(work.hiddenInCountries);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  /** Saves the list; a failure says so in plain words and keeps the choice on screen. */
  const save = async () => {
    try {
      await onChange({ kind: 'hiddenCountries', storyId: work.storyId, countries: hidden });
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    }
  };

  return (
    <section
      aria-labelledby={`classic-countries-${work.storyId}`}
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      <h4 id={`classic-countries-${work.storyId}`} className="m-0 text-base font-bold text-heading">
        {t('classicCountries.heading')}
      </h4>
      <p className="m-0 text-sm text-meta">{t('classicCountries.intro')}</p>
      <HiddenCountriesPicker
        hidden={hidden}
        onChange={(next) => {
          setHidden(next);
          setSaveState('idle');
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isChanging} onClick={() => void save()}>
          {t('classicCountries.save')}
        </Button>
        <p role="status" className="m-0 text-sm text-body">
          {saveState === 'saved' && t('classicCountries.saved')}
          {saveState === 'failed' && t('classicCountries.failed')}
        </p>
      </div>
    </section>
  );
}
