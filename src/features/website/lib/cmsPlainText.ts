/**
 * cmsPlainText: the words of CMS Markdown without its marks (G5b).
 *
 * Who calls it: faqStructuredData (answers for search engines) and HelpPageView (the reading time
 * under a help page's title). What it calls: mdast-util-from-markdown to parse the Markdown.
 */
import type { Nodes as MarkdownNode } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';

/** Markdown parts whose children are separate blocks, so their words get a blank line between. */
const blockContainers = new Set(['root', 'blockquote', 'list', 'listItem']);

/**
 * The words of one Markdown part, without its marks.
 *
 * @param node - a part of the parsed answer
 * @returns its plain text; raw HTML and pictures give nothing, a line break gives a new line
 */
function plainTextOf(node: MarkdownNode): string {
  // Raw HTML is never shown on the page (CLAUDE.md rule 8), so it is left out here too.
  if (node.type === 'html' || node.type === 'image') return '';
  if (node.type === 'break') return '\n';
  // Text, inline code and code blocks carry their words in `value`.
  if ('value' in node) return node.value;
  if (!('children' in node)) return '';
  const separator = blockContainers.has(node.type) ? '\n\n' : '';
  return node.children.map((child) => plainTextOf(child)).join(separator);
}

/**
 * CMS Markdown as plain text.
 *
 * @param markdown - an answer or a help page as written in the CMS
 * @returns plain text, paragraphs separated by a blank line
 */
export function markdownAsPlainText(markdown: string): string {
  return plainTextOf(fromMarkdown(markdown)).trim();
}

/** A comfortable reading speed for help text, in words a minute. */
const wordsPerMinute = 200;

/**
 * How many minutes a help page takes to read, for the "3 min read" line (board HelpArticle).
 *
 * @param markdown - the page body as written in the CMS
 * @returns whole minutes, at least 1
 */
export function readingMinutes(markdown: string): number {
  const words = markdownAsPlainText(markdown)
    .split(/\s+/)
    .filter((word) => word !== '');
  return Math.max(1, Math.ceil(words.length / wordsPerMinute));
}
