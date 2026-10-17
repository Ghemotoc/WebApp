/**
 * The marks inside a stored legal text and how the Legal centre shows them (story S1-E14-01).
 *
 * Who calls it: LegalMarkdown (src/features/legal/components/) passes remarkLegalMarks to
 * react-markdown; parseLegalDocument reads the section marker.
 * Two kinds of mark, neither of which changes a word of the text:
 * - {{afterTheInvitedTest}} at the start of a line: the line applies only after the invited March
 *   test (decided 17 Oct 2026, 19:43). The marker is removed and the list item or paragraph gets
 *   the attribute data-after-the-test, which LegalMarkdown turns into a visible label.
 * - [square brackets]: a placeholder or an open point still to be decided. It is shown as it is,
 *   highlighted, so nobody mistakes it for final text (decided 17 Oct 2026, 19:43, Q2). Brackets
 *   right after an opening quote are quoted words, such as “[Removed by the moderation team]”, and
 *   are left alone.
 */
import type { ListItem, Paragraph, PhrasingContent, Root, Text } from 'mdast';
import { visit } from 'unist-util-visit';

/** The marker scripts/build-legal-migration.ts puts on lines that apply after the invited test. */
export const afterTheInvitedTestMarker = '{{afterTheInvitedTest}}';

/** The HTML attribute a marked paragraph carries. */
export const afterTheTestAttribute = 'data-after-the-test';

/** A placeholder: text in square brackets. */
const placeholderPattern = /\[[^\]]+\]/g;

/** Characters that open a quote; brackets straight after one are quoted words, not placeholders. */
const openingQuotes = ['“', '„', '"'];

/**
 * Splits one text into plain parts and highlighted placeholders.
 *
 * @param value - the text
 * @returns the pieces, in order; a placeholder becomes an element shown as <mark>
 */
export function splitPlaceholders(value: string): PhrasingContent[] {
  const pieces: PhrasingContent[] = [];
  let lastEnd = 0;
  for (const match of value.matchAll(placeholderPattern)) {
    const start = match.index;
    // Quoted words in brackets stay plain text.
    if (openingQuotes.includes(value.charAt(start - 1))) continue;
    if (start > lastEnd) pieces.push({ type: 'text', value: value.slice(lastEnd, start) });
    pieces.push({
      type: 'emphasis',
      data: { hName: 'mark' },
      children: [{ type: 'text', value: match[0] }],
    });
    lastEnd = start + match[0].length;
  }
  if (lastEnd < value.length) pieces.push({ type: 'text', value: value.slice(lastEnd) });
  return pieces;
}

/**
 * Takes the after-the-test marker off a paragraph's first words, if it is there.
 *
 * @param paragraph - one paragraph (a list item's text is a paragraph too)
 * @returns true when the marker was there and has been removed
 */
function removeAfterTheTestMarker(paragraph: Paragraph): boolean {
  const firstChild = paragraph.children[0];
  if (firstChild?.type !== 'text' || !firstChild.value.startsWith(afterTheInvitedTestMarker))
    return false;
  firstChild.value = firstChild.value.slice(afterTheInvitedTestMarker.length).trimStart();
  return true;
}

/**
 * Marks a list item or paragraph as "after the test" with an HTML attribute, which LegalMarkdown
 * turns into a visible label. List items are marked on the item itself, because a short list's
 * items have no <p> of their own once rendered.
 *
 * @param node - the list item or paragraph to mark
 */
function markAfterTheTest(node: ListItem | Paragraph): void {
  node.data = { ...node.data, hProperties: { [afterTheTestAttribute]: 'true' } };
}

/**
 * The remark plugin: marks after-the-test paragraphs, then highlights placeholders.
 *
 * @returns the transform react-markdown runs on each text
 */
export function remarkLegalMarks() {
  return (tree: Root) => {
    // Step 1: list items, then paragraphs, so the marker never ends up inside a highlighted piece.
    visit(tree, 'listItem', (item: ListItem) => {
      const firstChild = item.children[0];
      if (firstChild?.type === 'paragraph' && removeAfterTheTestMarker(firstChild))
        markAfterTheTest(item);
    });
    visit(tree, 'paragraph', (paragraph: Paragraph) => {
      if (removeAfterTheTestMarker(paragraph)) markAfterTheTest(paragraph);
    });
    // Step 2: replace each text that holds a placeholder with its pieces.
    visit(tree, 'text', (node: Text, index, parent) => {
      if (parent === undefined || index === undefined) return;
      const pieces = splitPlaceholders(node.value);
      if (pieces.length === 1 && pieces[0]?.type === 'text') return;
      parent.children.splice(index, 1, ...(pieces as typeof parent.children));
      return index + pieces.length;
    });
  };
}
