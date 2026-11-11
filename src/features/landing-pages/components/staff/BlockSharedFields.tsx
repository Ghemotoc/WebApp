/**
 * BlockSharedFields: the fields of a block that are the same in both languages: the key dates,
 * the age groups who can enter and the Rules link (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * Part a2a adds how a Featured stories block picks its stories (FeaturedFields).
 * Dates are plain dates in Romanian time, shown without a countdown (no countdown timers, plan
 * 13a1). The Rules link is one of our own pages ("/help/contest-rules") or an https address; the
 * database checks it before publishing.
 * Who shows it: BlockCard, under the two language columns. What it calls: nothing on the server.
 */
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { landingAgeGroups, landingLinkKinds, type LandingBlock } from '@/schemas/landingPages';

import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { FeaturedFields } from './FeaturedFields';

/** What the fields need. */
interface BlockSharedFieldsProps {
  block: LandingBlock;
  index: number;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
}

/** The three key dates, in the order they happen, with their labels' keys. */
const dateParts = [
  { part: 'entries_open', labelKey: 'dates.entriesOpen' },
  { part: 'entries_close', labelKey: 'dates.entriesClose' },
  { part: 'results', labelKey: 'dates.results' },
] as const;

/**
 * The key dates: entries open, entries close and results.
 *
 * @returns the three date fields and the server's problem, if any
 */
function KeyDatesFields({ block, index, problems, onChange }: BlockSharedFieldsProps) {
  const { t } = useLandingPageTranslation();
  const dates = block.dates ?? { entries_open: '', entries_close: '', results: '' };
  const problem = problemFor(problems, `blocks.${index}.dates`);
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-ink">{t('editor.datesLegend')}</legend>
      <div className="flex flex-wrap gap-4">
        {dateParts.map(({ part, labelKey }) => (
          <div key={part} className="w-[200px]">
            <TextInput
              id={`landing-b${index}-${part}`}
              type="date"
              label={t(labelKey)}
              value={dates[part]}
              aria-invalid={problem === null ? undefined : true}
              onChange={(event) =>
                onChange({ ...block, dates: { ...dates, [part]: event.target.value } })
              }
            />
          </div>
        ))}
      </div>
      {problem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`editor.problems.dates_${problem}`)}</p>
      )}
    </fieldset>
  );
}

/**
 * The age groups who can enter, as toggle chips.
 *
 * @returns the chips and the server's problem, if any
 */
function AgeGroupFields({ block, index, problems, onChange }: BlockSharedFieldsProps) {
  const { t } = useLandingPageTranslation();
  const chosen = block.age_groups ?? [];
  const problem = problemFor(problems, `blocks.${index}.age_groups`);
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-ink">{t('ageGroupsLabel')}</legend>
      <div className="flex flex-wrap gap-2">
        {landingAgeGroups.map((group) => (
          <Chip
            key={group}
            isPressed={chosen.includes(group)}
            onPressedChange={(isPressed) => {
              // Keep the platform order, whatever order the admin ticks them in.
              const next = landingAgeGroups.filter((each) =>
                each === group ? isPressed : chosen.includes(each),
              );
              onChange({ ...block, age_groups: next });
            }}
          >
            {t(`ageGroups.${group}`)}
          </Chip>
        ))}
      </div>
      {problem !== null && (
        <p className="m-0 text-sm text-destructive">{t('editor.problems.age_groups')}</p>
      )}
    </fieldset>
  );
}

/**
 * The address a Rules block or a call to action links to (S1-E11-34 added the call to action).
 *
 * @returns the field
 */
function LinkField({ block, index, problems, onChange }: BlockSharedFieldsProps) {
  const { t } = useLandingPageTranslation();
  const problem = problemFor(problems, `blocks.${index}.link`);
  return (
    <div className="w-full max-w-[480px]">
      <TextInput
        id={`landing-b${index}-link`}
        label={t('editor.fields.link')}
        hint={t('editor.linkHint')}
        value={block.link ?? ''}
        errorMessage={problem === null ? undefined : t(`editor.problems.link_${problem}`)}
        onChange={(event) => onChange({ ...block, link: event.target.value })}
      />
    </div>
  );
}

/**
 * Renders the shared fields this block kind has, or nothing.
 *
 * @returns the fields
 */
export function BlockSharedFields(props: BlockSharedFieldsProps) {
  if (props.block.kind === 'key_dates') return <KeyDatesFields {...props} />;
  if (props.block.kind === 'who_can_enter') return <AgeGroupFields {...props} />;
  // A Rules block and a call to action both link to a page of ours or an https address.
  if (landingLinkKinds.includes(props.block.kind)) return <LinkField {...props} />;
  if (props.block.kind === 'featured') return <FeaturedFields {...props} />;
  return null;
}
