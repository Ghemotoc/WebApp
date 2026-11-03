/**
 * Names the field behind each problem the database lists before publishing ("blocks.2.ro.heading"
 * becomes "Block 3, Prize, Română: Heading"), and finds one field's problem for its input (story
 * S1-E11-14; bundle CONTESTS-13a1).
 *
 * Who calls it: the editor (components/staff/LandingEditorForm.tsx and BlockCard.tsx). What it
 * calls: the translation function it is given and the problem list from the server.
 */
import type { TFunction } from 'i18next';

import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import type { LandingContent } from '@/schemas/landingPages';

/**
 * The problem the server named for one field, or null.
 *
 * @param problems - the last failure's problems (empty when none)
 * @param field - the field's path, for example "blocks.2.en.body"
 * @returns the problem word ("empty", "too_long" ...), or null
 */
export function problemFor(problems: readonly FieldProblem[], field: string): string | null {
  return problems.find((problem) => problem.field === field)?.problem ?? null;
}

/**
 * The name of one block, by its place and kind ("Block 3: Prize").
 *
 * @returns the name
 */
function blockNameOf(blockNumber: string, content: LandingContent, t: TFunction): string {
  const index = Number(blockNumber);
  const kind = content.blocks[index]?.kind ?? 'text';
  return t('editor.blockName', { number: index + 1, kind: t(`kinds.${kind}`) });
}

/**
 * The words for one field path, for the list of fields to fix.
 *
 * @param field - the path from the server ("theme", "blocks", "blocks.0.ro.title", "blocks.3.dates")
 * @param content - the page as the editor holds it, to name each block's kind
 * @param t - the landingPages translations
 * @returns the label
 */
export function labelOfField(field: string, content: LandingContent, t: TFunction): string {
  const [first = '', blockNumber, part, name = ''] = field.split('.');
  // Step 1: the page-wide fields.
  if (first !== 'blocks' || blockNumber === undefined) {
    return t(`editor.fields.${first}`, { defaultValue: field });
  }
  // Step 2: the block, by its place and kind.
  const blockName = blockNameOf(blockNumber, content, t);
  if (part === undefined) return blockName;
  // Step 3: a field in one language ("ro" or "en"), or a field both languages share.
  if (part === 'ro' || part === 'en') {
    const fieldName = t(`editor.fields.${name}`, { defaultValue: name });
    return `${blockName}, ${t(`languages.${part}`)}: ${fieldName}`;
  }
  return `${blockName}: ${t(`editor.fields.${part}`, { defaultValue: part })}`;
}
