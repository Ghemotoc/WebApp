/**
 * Splits a text into plain parts and {{placeholder}} names, so the preview can draw each
 * placeholder as a chip (story S1-E11-18 criterion 2; S1-E11-19 locked placeholders).
 * Who calls it: components/TextPreview.tsx.
 */

/**
 * Splits a text into plain parts and placeholder names.
 *
 * @param text - the text
 * @returns the parts, in order
 */
export function previewParts(text: string): { kind: 'text' | 'placeholder'; value: string }[] {
  const parts: { kind: 'text' | 'placeholder'; value: string }[] = [];
  let rest = text;
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)[^}]*\}\}/g)) {
    const before = rest.slice(0, rest.indexOf(match[0]));
    if (before !== '') parts.push({ kind: 'text', value: before });
    parts.push({ kind: 'placeholder', value: match[1] ?? '' });
    rest = rest.slice(rest.indexOf(match[0]) + match[0].length);
  }
  if (rest !== '') parts.push({ kind: 'text', value: rest });
  return parts;
}
