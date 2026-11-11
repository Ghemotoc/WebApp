/**
 * EntryItemsFields: the cards of a Cards block or the steps of a Steps block, Romanian and English
 * side by side, with "Add a card" (or step) and "Remove" (story S1-E11-34; bundle CMS-2b).
 *
 * An entry is added or removed in both languages at once, and the buttons stop at the fewest and
 * most the block may hold (2 to 4 cards, 2 to 6 steps), the same limits the database checks.
 * Who shows it: BlockCard for a Cards or Steps block. What it calls: the helpers in lib/entries.ts
 * and CountedField.
 */
import { Button } from '@/components/ui/Button';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { CountedField } from '@/features/website/components/staff/CountedField';
import {
  landingEntryCounts,
  landingEntryLimits,
  landingLanguages,
  type LandingBlock,
  type LandingEntryKind,
  type LandingLanguage,
} from '@/schemas/landingPages';

import { addEntry, entriesOf, removeEntry, withEntryPart } from '../../lib/entries';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the fields need. */
interface EntryItemsFieldsProps {
  block: LandingBlock;
  kind: LandingEntryKind;
  index: number;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
}

/** What one entry's fields in one language need. */
type EntryFieldsProps = EntryItemsFieldsProps & { entryIndex: number; language: LandingLanguage };

/**
 * One entry's title and words in one language.
 *
 * @returns a fieldset with the entry and language as its legend
 */
function EntryLanguageFields(props: EntryFieldsProps) {
  const { block, kind, index, entryIndex, language, problems, onChange } = props;
  const { t } = useLandingPageTranslation();
  const entry = entriesOf(block, language)[entryIndex] ?? { title: '', body: '' };
  // The server names a whole entry ("blocks.2.en.entries.0") when either part is wrong.
  const problem = problemFor(problems, `blocks.${index}.${language}.entries.${entryIndex}`);
  const idOf = (part: string) => `landing-b${index}-${language}-e${entryIndex}-${part}`;
  /** Changes the title or the words. */
  const change = (part: 'title' | 'body', value: string) =>
    onChange(withEntryPart(block, { language, index: entryIndex, part }, value));
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-ink">
        {t(`editor.entries.${kind}.legend`, {
          number: entryIndex + 1,
          language: t(`languages.${language}`),
        })}
      </legend>
      <CountedField
        id={idOf('title')}
        label={t('editor.fields.entryTitle')}
        lang={language}
        value={entry.title}
        limit={landingEntryLimits.title}
        serverProblem={entry.title.trim() === '' ? problem : null}
        onChange={(value) => change('title', value)}
      />
      <CountedField
        id={idOf('body')}
        label={t('editor.fields.entryBody')}
        lang={language}
        isMultiline
        value={entry.body}
        limit={landingEntryLimits.body}
        serverProblem={entry.body.trim() === '' ? problem : null}
        onChange={(value) => change('body', value)}
      />
    </fieldset>
  );
}

/**
 * One entry's fields in both languages, with its Remove button.
 *
 * @returns the list item
 */
function EntryRow(props: EntryItemsFieldsProps & { entryIndex: number; canRemove: boolean }) {
  const { t } = useLandingPageTranslation();
  return (
    <li className="flex flex-col gap-3 border-t border-hairline pt-3">
      <div className="grid gap-4 md:grid-cols-2">
        {landingLanguages.map((language) => (
          <EntryLanguageFields key={language} {...props} language={language} />
        ))}
      </div>
      <div>
        <Button
          variant="destructive"
          disabled={!props.canRemove}
          onClick={() => props.onChange(removeEntry(props.block, props.entryIndex))}
        >
          {t(`editor.entries.${props.kind}.remove`, { number: props.entryIndex + 1 })}
        </Button>
      </div>
    </li>
  );
}

/**
 * Renders the list and the Add button.
 *
 * @returns the entries
 */
export function EntryItemsFields(props: EntryItemsFieldsProps) {
  const { t } = useLandingPageTranslation();
  const count = entriesOf(props.block, 'ro').length;
  const limits = landingEntryCounts[props.kind];
  const listProblem = problemFor(props.problems, `blocks.${props.index}.entries`);
  return (
    <div className="flex flex-col gap-3">
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {Array.from({ length: count }, (_, entryIndex) => (
          <EntryRow
            key={entryIndex}
            {...props}
            entryIndex={entryIndex}
            canRemove={count > limits.fewest}
          />
        ))}
      </ol>
      {listProblem !== null && (
        <p className="m-0 text-sm text-destructive">
          {t(`editor.entries.${props.kind}.howMany`, limits)}
        </p>
      )}
      <div>
        <Button
          variant="secondary"
          disabled={count >= limits.most}
          onClick={() => props.onChange(addEntry(props.block))}
        >
          {t(`editor.entries.${props.kind}.add`)}
        </Button>
      </div>
    </div>
  );
}
