/**
 * ContestForm: every detail of one contest, with Save (story S1-E11-15 criterion 1; bundle
 * CONTESTS-13b1).
 *
 * What it shows: the names, dates, who can enter, what counts and the word limit, the prize, who
 * delivers it and the judges, and the address of the help page with the full rules. Saving keeps
 * the contest as a draft until it opens (ContestOpenPanel); an open contest refuses a save that
 * would leave it incomplete, and the notice lists what is missing.
 * Who shows it: ContestEditorPage. What it calls: save() from useContestEditor().
 */
import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { contestFieldLimits, type ContestDetails } from '@/schemas/contests';

import type { StaffContest } from '../../api/contests';
import type { useContestEditor } from '../../hooks/useStaffContests';
import { useContestTranslation } from '../../registerContestTranslations';

import { BilingualFields, ContestDatesFields, ContestWhoFields } from './ContestFieldGroups';
import { ProblemList } from './ProblemList';

/** The editor's state from the hook. */
type ContestEditor = ReturnType<typeof useContestEditor>;

/**
 * The editable fields of a contest, without its id, page and opening time.
 *
 * @param contest - the contest as read
 * @returns the details the form starts from
 */
function detailsOf(contest: StaffContest): ContestDetails {
  return {
    name_ro: contest.name_ro,
    name_en: contest.name_en,
    entries_open_on: contest.entries_open_on,
    entries_close_on: contest.entries_close_on,
    results_on: contest.results_on,
    age_groups: contest.age_groups,
    market_codes: contest.market_codes,
    language_codes: contest.language_codes,
    what_counts_ro: contest.what_counts_ro,
    what_counts_en: contest.what_counts_en,
    word_limit: contest.word_limit,
    prize_ro: contest.prize_ro,
    prize_en: contest.prize_en,
    prize_delivered_by: contest.prize_delivered_by,
    judges: contest.judges,
    rules_page_key: contest.rules_page_key,
  };
}

/** One titled part of the form. */
function FormPart({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <legend className="px-1 font-heading text-[20px] font-bold text-heading">{legend}</legend>
      {children}
    </fieldset>
  );
}

/** The word limit, who delivers the prize, the judges and the rules page. */
function ContestPlainFields(props: {
  details: ContestDetails;
  set: (patch: Partial<ContestDetails>) => void;
}) {
  const { details, set } = props;
  const { t } = useContestTranslation();
  return (
    <>
      <TextInput
        id="contest-prize-delivered-by"
        label={t('staff.editor.fields.prize_delivered_by')}
        maxLength={contestFieldLimits.prizeDeliveredBy}
        value={details.prize_delivered_by}
        onChange={(event) => set({ prize_delivered_by: event.target.value })}
      />
      <Textarea
        id="contest-judges"
        label={t('staff.editor.fields.judges')}
        hint={t('staff.editor.fields.judgesHint')}
        rows={3}
        maxLength={contestFieldLimits.judges}
        value={details.judges}
        onChange={(event) => set({ judges: event.target.value })}
      />
    </>
  );
}

/** The outcome of the last save, under the button. */
function SaveNotice({ editor }: { editor: ContestEditor }) {
  const { t } = useContestTranslation();
  if (editor.failure !== null && editor.failure.reason !== 'not_ready') {
    return (
      <Notice tone="error">
        <p className="m-0">
          {t(`staff.editor.failures.${editor.failure.reason}`, {
            defaultValue: t('staff.editor.failures.failed'),
          })}
        </p>
        <ProblemList problems={editor.failure.problems} />
      </Notice>
    );
  }
  if (editor.lastAction === 'save')
    return <Notice tone="success">{t('staff.editor.saved')}</Notice>;
  return null;
}

/** What each part of the form needs. */
interface PartProps {
  details: ContestDetails;
  set: (patch: Partial<ContestDetails>) => void;
  setField: SetField;
}

/** How a field group changes one value. */
type SetField = <Field extends keyof ContestDetails>(
  field: Field,
  value: ContestDetails[Field],
) => void;

/** What counts, in both languages, and the word limit. */
function EntryPart({ details, set, setField }: PartProps) {
  const { t } = useContestTranslation();
  return (
    <FormPart legend={t('staff.editor.sections.entry')}>
      <BilingualFields
        field="what_counts"
        details={details}
        set={setField}
        longest={contestFieldLimits.whatCounts}
        isMultiline
      />
      <TextInput
        id="contest-word-limit"
        type="number"
        inputMode="numeric"
        label={t('staff.editor.fields.word_limit')}
        hint={t('staff.editor.fields.word_limitHint')}
        value={details.word_limit === null ? '' : String(details.word_limit)}
        onChange={(event) =>
          set({ word_limit: event.target.value === '' ? null : Number(event.target.value) })
        }
      />
    </FormPart>
  );
}

/** The prize in both languages, who delivers it and the judges. */
function PrizePart({ details, set, setField }: PartProps) {
  const { t } = useContestTranslation();
  return (
    <FormPart legend={t('staff.editor.sections.prize')}>
      <BilingualFields
        field="prize"
        details={details}
        set={setField}
        longest={contestFieldLimits.prize}
        isMultiline
      />
      <ContestPlainFields details={details} set={set} />
    </FormPart>
  );
}

/** The rules help page's address. */
function RulesPart({ details, set }: PartProps) {
  const { t } = useContestTranslation();
  return (
    <FormPart legend={t('staff.editor.sections.rules')}>
      <TextInput
        id="contest-rules-page"
        label={t('staff.editor.fields.rules_page_key')}
        hint={t('staff.editor.fields.rulesHint')}
        value={details.rules_page_key ?? ''}
        onChange={(event) =>
          set({ rules_page_key: event.target.value.trim() === '' ? null : event.target.value })
        }
      />
    </FormPart>
  );
}

/**
 * Renders the form for one contest.
 *
 * @param props.contest - the contest as read
 * @param props.editor - the editor's state and actions
 * @returns the form
 */
export function ContestForm({ contest, editor }: { contest: StaffContest; editor: ContestEditor }) {
  const { t } = useContestTranslation();
  const [details, setDetails] = useState<ContestDetails>(() => detailsOf(contest));
  // One change merges into the current values; setField changes one named field.
  const set = (patch: Partial<ContestDetails>) =>
    setDetails((current) => ({ ...current, ...patch }));
  const setField: SetField = (field, value) =>
    setDetails((current) => ({ ...current, [field]: value }));
  const part = { details, set, setField };
  /** Saves every field. */
  function submit(event: FormEvent) {
    event.preventDefault();
    editor.save(details);
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <FormPart legend={t('staff.editor.sections.names')}>
        <BilingualFields
          field="name"
          details={details}
          set={setField}
          longest={contestFieldLimits.name}
          isMultiline={false}
        />
      </FormPart>
      <FormPart legend={t('staff.editor.sections.dates')}>
        <ContestDatesFields details={details} set={setField} />
      </FormPart>
      <FormPart legend={t('staff.editor.sections.who')}>
        <ContestWhoFields details={details} set={setField} choices={editor.choices} />
      </FormPart>
      <EntryPart {...part} />
      <PrizePart {...part} />
      <RulesPart {...part} />
      <div className="flex flex-col gap-3 rounded-card bg-tint p-5" aria-live="polite">
        <SaveNotice editor={editor} />
        <div>
          <Button type="submit" disabled={editor.isBusy}>
            {editor.isBusy ? t('staff.editor.saving') : t('staff.editor.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
