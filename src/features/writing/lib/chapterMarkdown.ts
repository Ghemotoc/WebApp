/**
 * The two converters between the stored chapter text (the Markdown subset of CLAUDE.md rule 8)
 * and the editor's document (TipTap / ProseMirror JSON), story S1-E3-02a (ADR 0005).
 *
 * Why Markdown: rule 8 names it; it exports to Word later (S1-E13-02), cuts cleanly for the
 * teaser (S1-E4-04) and searches with Postgres full text (S1-E5-04). The editor never sees
 * Markdown: it works on a document tree, and these two functions translate at the edges.
 * Allowed nodes: paragraphs, headings (levels 2 and 3), bold, italic, quote, bullet and
 * numbered lists, the scene break (* * *) and links (http, https, mailto). Anything else in
 * the Markdown (raw HTML, pictures, code) becomes plain text, so nothing unexpected survives.
 *
 * Who calls it: useChapterEditor (Markdown → document when the chapter loads; document →
 * Markdown on every save). Tests: chapterMarkdown.test.ts (a round trip for every node).
 */
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Nodes as MarkdownNode, PhrasingContent, RootContent } from 'mdast';

import { isAllowedLink } from '@/lib/safe-links';

/** A mark on a run of text: bold, italic or a link. */
export interface EditorMark {
  type: 'bold' | 'italic' | 'link';
  attrs?: { href: string };
}

/** A node in the editor's document (the subset of TipTap's JSON this app uses). */
export interface EditorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: EditorMark[];
  text?: string;
}

// The link rule lives in src/lib/safe-links.ts so the reader shares it; re-exported here for
// the editor's code and tests.
export { isAllowedLink } from '@/lib/safe-links';

/* ---------- Markdown → document ---------- */

/** Text from a node, flattened, for the nodes we don't keep (pictures, code, raw HTML). */
function plainTextOf(node: MarkdownNode): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return node.children.map((child) => plainTextOf(child)).join('');
  return '';
}

/** Inline content: text with its marks, breaks, and the rest flattened to text. */
function inlineToEditor(nodes: PhrasingContent[], marks: EditorMark[]): EditorNode[] {
  const result: EditorNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      result.push(textNode(node.value, marks));
    } else if (node.type === 'strong') {
      result.push(...inlineToEditor(node.children, [...marks, { type: 'bold' }]));
    } else if (node.type === 'emphasis') {
      result.push(...inlineToEditor(node.children, [...marks, { type: 'italic' }]));
    } else if (node.type === 'link' && isAllowedLink(node.url)) {
      result.push(
        ...inlineToEditor(node.children, [...marks, { type: 'link', attrs: { href: node.url } }]),
      );
    } else if (node.type === 'break') {
      result.push({ type: 'hardBreak' });
    } else {
      // A link we refuse, inline code, a picture, raw HTML: the words stay, the rest goes.
      const text = plainTextOf(node);
      if (text !== '') result.push(textNode(text, marks));
    }
  }
  return result;
}

/** One text node; an empty marks list is left out, as TipTap writes it. */
function textNode(text: string, marks: EditorMark[]): EditorNode {
  return marks.length === 0 ? { type: 'text', text } : { type: 'text', text, marks };
}

/** A paragraph node, or an empty one when there is nothing inside. */
function paragraph(content: EditorNode[]): EditorNode {
  return content.length === 0 ? { type: 'paragraph' } : { type: 'paragraph', content };
}

/** A list: bullet or numbered, each item holding blocks. */
function listToEditor(node: Extract<RootContent, { type: 'list' }>): EditorNode {
  const isOrdered = node.ordered === true;
  return {
    type: isOrdered ? 'orderedList' : 'bulletList',
    ...(isOrdered ? { attrs: { start: node.start ?? 1 } } : {}),
    content: node.children.map((item) => ({
      type: 'listItem',
      content: blocksToEditor(item.children),
    })),
  };
}

/** One block node, or null for the kinds that become plain text. */
function blockToEditor(node: RootContent): EditorNode | null {
  switch (node.type) {
    case 'paragraph':
      return paragraph(inlineToEditor(node.children, []));
    case 'heading':
      // Level 1 is the story's own title; level 4 and deeper are too small. Both snap to 2 and 3.
      return {
        type: 'heading',
        attrs: { level: node.depth <= 2 ? 2 : 3 },
        content: inlineToEditor(node.children, []),
      };
    case 'blockquote':
      return { type: 'blockquote', content: blocksToEditor(node.children) };
    case 'list':
      return listToEditor(node);
    case 'thematicBreak':
      return { type: 'horizontalRule' };
    default:
      return null;
  }
}

/** Block content: the allowed blocks, with everything else turned into a paragraph of text. */
function blocksToEditor(nodes: RootContent[]): EditorNode[] {
  const result: EditorNode[] = [];
  for (const node of nodes) {
    const block = blockToEditor(node);
    if (block !== null) {
      result.push(block);
      continue;
    }
    // Code blocks, raw HTML, tables and the rest: their words become an ordinary paragraph.
    const text = plainTextOf(node);
    if (text.trim() !== '') result.push(paragraph([textNode(text, [])]));
  }
  return result;
}

/**
 * Turns stored Markdown into the editor's document.
 *
 * @param markdown - the chapter body as saved (the Markdown subset; anything else is flattened)
 * @returns a TipTap document; an empty body gives one empty paragraph
 */
export function markdownToEditorDocument(markdown: string): EditorNode {
  const tree = fromMarkdown(markdown);
  const content = blocksToEditor(tree.children);
  return { type: 'doc', content: content.length === 0 ? [{ type: 'paragraph' }] : content };
}

/* ---------- Document → Markdown ---------- */

/** Characters that would start Markdown formatting if left bare inside plain text. */
const inlineSpecials = /([\\*_`[\]<>~])/g;

/** A line start Markdown would read as a heading, quote, bullet or rule ("# ", "> ", "- "). */
const lineStartMarkers = /^(\s*)([#>+-])(?=\s|$)/;

/** A line start Markdown would read as a numbered list ("1. " or "1) "). */
const lineStartNumbers = /^(\s*)(\d+)([.)])(?=\s|$)/;

/**
 * Escapes plain text so it comes back as the same text, not as formatting.
 *
 * @param text - the words as the writer typed them
 * @returns the text with Markdown's special characters backslashed
 */
export function escapeMarkdownText(text: string): string {
  return text
    .replace(inlineSpecials, '\\$1')
    .replace(lineStartMarkers, '$1\\$2')
    .replace(lineStartNumbers, '$1$2\\$3');
}

/** The marks around one run of text, innermost first: link, then italic, then bold. */
function wrapWithMarks(text: string, marks: EditorMark[]): string {
  let result = text;
  if (marks.some((mark) => mark.type === 'italic')) result = `*${result}*`;
  if (marks.some((mark) => mark.type === 'bold')) result = `**${result}**`;
  const link = marks.find((mark) => mark.type === 'link');
  if (link !== undefined && isAllowedLink(link.attrs?.href ?? '')) {
    result = `[${result}](${link.attrs?.href ?? ''})`;
  }
  return result;
}

/** Inline content back to Markdown. Runs with the same marks are joined before wrapping. */
function inlineToMarkdown(nodes: EditorNode[] | undefined): string {
  let result = '';
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      result += '  \n';
    } else if (node.type === 'text') {
      result += wrapWithMarks(escapeMarkdownText(node.text ?? ''), node.marks ?? []);
    }
  }
  return result;
}

/** Indents every line of a block, for list items and quotes. */
function indentLines(text: string, firstPrefix: string, restPrefix: string): string {
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? firstPrefix : restPrefix) + line)
    .join('\n');
}

/** One block back to Markdown, or null for a node kind the document never holds. */
function blockToMarkdown(node: EditorNode): string | null {
  switch (node.type) {
    case 'paragraph':
      return inlineToMarkdown(node.content);
    case 'heading':
      return `${'#'.repeat(node.attrs?.level === 2 ? 2 : 3)} ${inlineToMarkdown(node.content)}`;
    case 'blockquote':
      return indentLines(blocksToMarkdown(node.content), '> ', '> ');
    case 'bulletList':
    case 'orderedList':
      return listToMarkdown(node);
    case 'horizontalRule':
      return '* * *';
    default:
      return null;
  }
}

/** Block content back to Markdown, blocks separated by a blank line. */
function blocksToMarkdown(nodes: EditorNode[] | undefined): string {
  const blocks: string[] = [];
  for (const node of nodes ?? []) {
    const block = blockToMarkdown(node);
    if (block !== null) blocks.push(block);
  }
  return blocks.join('\n\n');
}

/** A list: "- item" or "1. item", with a multi-block item indented under its marker. */
function listToMarkdown(list: EditorNode): string {
  const start = typeof list.attrs?.start === 'number' ? list.attrs.start : 1;
  return (list.content ?? [])
    .map((item, index) => {
      const marker = list.type === 'orderedList' ? `${start + index}. ` : '- ';
      return indentLines(blocksToMarkdown(item.content), marker, ' '.repeat(marker.length));
    })
    .join('\n');
}

/**
 * Turns the editor's document into the Markdown that is stored.
 *
 * @param document - the TipTap document
 * @returns the Markdown subset, trimmed; an empty document gives ''
 */
export function editorDocumentToMarkdown(document: EditorNode): string {
  return blocksToMarkdown(document.content).trim();
}

/** The text of a node and its children, blocks separated by a blank line. */
function plainTextOfEditorNode(node: EditorNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'horizontalRule') return '* * *';
  const parts = (node.content ?? []).map(plainTextOfEditorNode);
  const isInline = (node.content ?? []).every(
    (child) => child.type === 'text' || child.type === 'hardBreak',
  );
  return parts.join(isInline ? '' : '\n\n');
}

/**
 * The words of a stored chapter without its Markdown marks, for reading two versions side by
 * side (the compare dialog, S1-E3-02b).
 *
 * @param markdown - the chapter body as saved
 * @returns plain text, paragraphs separated by a blank line
 */
export function markdownToPlainText(markdown: string): string {
  return plainTextOfEditorNode(markdownToEditorDocument(markdown)).trim();
}
