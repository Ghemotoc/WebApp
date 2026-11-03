/**
 * BlockLanguageColumn: one language's text fields of one block, with their counters (story
 * S1-E11-14 criterion 3: Romanian and English side by side; bundle CONTESTS-13a1).
 *
 * The fields and their limits come from landingFieldRules, the same table the database checks
 * before publishing, so the counter and the server agree. Each input carries its language in
 * `lang`, so a screen reader reads the Romanian words in Romanian.
 * Who shows it: BlockCard, once for each language. What it calls: CountedField from the website
 * editors.
 */
import { CountedField } from '@/features/website/components/staff/CountedField';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { landingFieldRules, type LandingBlock, type LandingLanguage } from '@/schemas/landingPages';

import { withWords, wordsOf } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** The longest single-line field; anything longer gets a text area. */
const longestSingleLine = 80;

/** What the column needs. */
interface BlockLanguageColumnProps {
  block: LandingBlock;
  index: number;
  language: LandingLanguage;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
}

/**
 * Renders the column.
 *
 * @returns a fieldset with the language as its legend
 */
export function BlockLanguageColumn({
  block,
  index,
  language,
  problems,
  onChange,
}: BlockLanguageColumnProps) {
  const { t } = useLandingPageTranslation();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-ink">
        {t(`languages.${language}`)}
      </legend>
      {landingFieldRules[block.kind].map((rule) => {
        // Step 1: the field's path is the one the server uses in its list of fields to fix.
        const path = `blocks.${index}.${language}.${rule.field}`;
        return (
          <CountedField
            key={rule.field}
            id={`landing-b${index}-${language}-${rule.field}`}
            label={t(`editor.fields.${rule.field}`)}
            lang={language}
            value={wordsOf(block, language, rule.field)}
            limit={rule.longest}
            isMultiline={rule.longest > longestSingleLine}
            serverProblem={problemFor(problems, path)}
            onChange={(value) => onChange(withWords(block, language, rule.field, value))}
          />
        );
      })}
    </fieldset>
  );
}
