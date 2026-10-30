/**
 * SeasonalTab: Staff › Website › Seasonal doodles, where the owner and admins plan which doodle
 * shows by Discover's heading and Search's popular tags on which days (story S1-E11-11).
 *
 * What it shows: the occasions with Change and Remove, "Add an occasion" (OccasionForm), and the
 * year view with any gaps (OccasionYearView). A change applies at once and is in the audit log.
 * Plain staff components; the only pictures are the doodles being chosen (DoodlePicker).
 * Who shows it: WebsiteAdminPage (/staff/website/seasonal). What it calls: useOccasionSchedule().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { EditorFeedback } from '@/features/website/components/staff/EditorFeedback';

import type { Occasion, OccasionDraft } from '../../api/seasonalStore';
import { useOccasionSchedule, type OccasionSchedule } from '../../hooks/useOccasionSchedule';
import { localDateOf } from '../../lib/seasonalCalendar';

import { OccasionForm } from './OccasionForm';
import { OccasionYearView } from './OccasionYearView';

/**
 * A new occasion: today, one day, every year, on both places.
 *
 * @returns the empty draft
 */
function newDraft(): OccasionDraft {
  const today = localDateOf();
  return {
    id: null,
    nameRo: '',
    nameEn: '',
    startsOn: today,
    endsOn: today,
    everyYear: true,
    doodle: 'sunny_face',
    showsOn: 'both',
    isSeasonDefault: false,
  };
}

/**
 * An occasion's dates in words: "25 October to 31 October", with the year only for a one-off.
 *
 * @param occasion - the occasion
 * @param language - the interface language
 * @returns the first and last day, formatted
 */
function datesOf(occasion: Occasion, language: string): { from: string; to: string } {
  const format = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    year: occasion.everyYear ? undefined : 'numeric',
    timeZone: 'UTC',
  });
  const dayOf = (isoDate: string) => format.format(new Date(`${isoDate}T12:00:00Z`));
  return { from: dayOf(occasion.startsOn), to: dayOf(occasion.endsOn) };
}

/**
 * The occasions, each with Change and Remove.
 *
 * @returns the list
 */
function OccasionList({
  schedule,
  onEdit,
}: {
  schedule: OccasionSchedule;
  onEdit: (occasion: Occasion) => void;
}) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const isRomanian = i18n.language.startsWith('ro');
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {schedule.occasions.map((occasion) => {
        const name = isRomanian ? occasion.nameRo : occasion.nameEn;
        return (
          <li
            key={occasion.id}
            className="flex flex-wrap items-center gap-3 border-b border-hairline py-3"
          >
            <span className="min-w-0 flex-1 text-ink">
              <span className="font-semibold">{name}</span>{' '}
              <span className="text-meta">
                {t('seasonal.listDates', datesOf(occasion, i18n.language))}
                {occasion.everyYear ? `, ${t('seasonal.everyYearShort')}` : ''}
                {`, ${t(`seasonal.doodles.${occasion.doodle}`)}`}
              </span>
            </span>
            <Button
              variant="secondary"
              aria-label={t('seasonal.editNamed', { name })}
              onClick={() => onEdit(occasion)}
            >
              {t('seasonal.edit')}
            </Button>
            <Button
              variant="destructive"
              aria-label={t('seasonal.removeNamed', { name })}
              disabled={schedule.isBusy}
              onClick={() => void schedule.act({ kind: 'remove', occasionId: occasion.id })}
            >
              {t('seasonal.remove')}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Renders the tab.
 *
 * @returns the schedule screen
 */
export function SeasonalTab() {
  const { t } = useTranslation('websiteAdmin');
  const schedule = useOccasionSchedule();
  const [editing, setEditing] = useState<OccasionDraft | null>(null);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  // Saving closes the form only when the database took it; otherwise the fields show the problems.
  const save = async (draft: OccasionDraft) => {
    if (await schedule.act({ kind: 'save', draft })) setEditing(null);
  };
  const years = [thisYear - 1, thisYear, thisYear + 1].map(String);
  return (
    <div className="flex flex-col gap-6">
      <p className="m-0 max-w-[760px] text-body">{t('seasonal.intro')}</p>
      {schedule.loadFailed && <Notice tone="error">{t('failures.unreachable')}</Notice>}
      <EditorFeedback state={schedule} labelOf={(field) => t(`seasonal.fields.${field}`)} />
      {editing === null ? (
        <div>
          <Button
            onClick={() => {
              schedule.clearFeedback();
              setEditing(newDraft());
            }}
          >
            {t('seasonal.add')}
          </Button>
        </div>
      ) : (
        <OccasionForm
          key={editing.id ?? 'new'}
          initial={editing}
          failure={schedule.failure}
          isBusy={schedule.isBusy}
          onSave={(draft) => void save(draft)}
          onCancel={() => setEditing(null)}
        />
      )}
      <OccasionList
        schedule={schedule}
        onEdit={(occasion) => {
          schedule.clearFeedback();
          setEditing(occasion);
        }}
      />
      <Select
        id="seasonal-year"
        label={t('seasonal.year')}
        isLabelVisible
        value={String(year)}
        options={years.map((value) => ({ value, label: value }))}
        onChange={(value) => setYear(Number(value))}
      />
      <OccasionYearView occasions={schedule.occasions} year={year} />
    </div>
  );
}
