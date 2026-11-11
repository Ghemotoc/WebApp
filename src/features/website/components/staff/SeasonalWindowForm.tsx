/**
 * SeasonalWindowForm: "Change Winter", the first and last day of one seasonal look (bundle G12a;
 * the StaffWebsiteSeasonal board's editing card).
 *
 * The board also draws names in each language, "Every year", "Season default" and a Look picker
 * for occasions such as Christmas. The app has four seasonal looks and no occasion looks, so this
 * card changes only the days; occasions come once there are looks for them (noted in the PR).
 * Who shows it: SeasonalLooksTab, for the window being changed. What it calls: MonthDayField.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { SeasonalWindow } from '@/lib/looks';

import { MonthDayField } from './MonthDayField';

/** What the form needs. */
interface SeasonalWindowFormProps {
  window: SeasonalWindow;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (changed: SeasonalWindow) => void;
}

/**
 * Renders the card.
 *
 * @returns the editing card
 */
export function SeasonalWindowForm({
  window,
  isSaving,
  onCancel,
  onSave,
}: SeasonalWindowFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const [from, setFrom] = useState(window.from);
  const [to, setTo] = useState(window.to);
  const lookName = t(`seasonal.looks.${window.look}`);
  return (
    <section
      aria-labelledby="seasonal-form-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="seasonal-form-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('seasonal.changeHeading', { name: lookName })}
      </h2>
      <MonthDayField
        id="seasonal-from"
        legend={t('seasonal.firstDay')}
        value={from}
        onChange={setFrom}
      />
      <MonthDayField
        id="seasonal-to"
        legend={t('seasonal.lastDay')}
        value={to}
        onChange={setTo}
        hint={t('seasonal.lastDayHint')}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('seasonal.cancel')}
        </Button>
        <Button
          type="button"
          disabled={isSaving}
          onClick={() => onSave({ look: window.look, from, to })}
        >
          {t('seasonal.save')}
        </Button>
      </div>
    </section>
  );
}
