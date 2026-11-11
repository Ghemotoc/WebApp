/**
 * poemStanzas: a rehype plugin that draws a poem as stanzas and lines (bundle MUST-2;
 * IDEA-20261106-1).
 *
 * Every top-level paragraph of a poem is a stanza: it becomes a group for screen readers ("Stanza
 * 2") and its lines, split at each line break, each become a block of their own
 * (<span class="tmc-poem-line">), so a screen reader reads each line as a line and a long line
 * wraps under a hanging indent instead of losing its shape (the `.tmc-poem` styles in
 * src/styles/index.css). A line break written as a plain new line (older or imported text) counts
 * too. Paragraphs that hold a picture or a card are left alone, and so are lists, quotes and
 * headings. Nothing is added from the text itself: only the element names the chapter already
 * allows, plus the line spans this plugin makes.
 * Who uses it: ChapterText (src/features/reading/components/), for chapters whose is_poem is true.
 */
import type { Element, ElementContent, Root } from 'hast';

/** What the plugin needs. */
export interface PoemStanzasOptions {
  /** The stanza's name for screen readers, from its number (1 for the first). */
  stanzaLabel: (number: number) => string;
}

/** True for a picture or card image, which keeps its paragraph as a block (ChapterText). */
function isMedia(child: ElementContent): boolean {
  return child.type === 'element' && child.tagName === 'img';
}

/** One line of a stanza as its own block. */
function lineElement(children: ElementContent[]): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['tmc-poem-line'] },
    children,
  };
}

/**
 * Splits a stanza's content into lines at each <br> and each plain new line.
 *
 * @param children - the paragraph's content
 * @returns one line element per line, in order (an empty line stays, as an empty line)
 */
export function splitPoemLines(children: ElementContent[]): Element[] {
  const lines: Element[] = [];
  let current: ElementContent[] = [];
  /** Closes the line being built and starts the next. */
  const endLine = () => {
    lines.push(lineElement(current));
    current = [];
  };
  let afterBreak = false;
  for (const child of children) {
    // Step 1: a <br> ends the line.
    if (child.type === 'element' && child.tagName === 'br') {
      endLine();
      afterBreak = true;
      continue;
    }
    // Step 2: anything that isn't plain text (bold, italic, a link) joins the line as it is.
    if (child.type !== 'text') {
      current.push(child);
      afterBreak = false;
      continue;
    }
    // Step 3: Markdown writes the new line that follows a <br> as text; it belongs to the break.
    const text = afterBreak ? child.value.replace(/^\n/, '') : child.value;
    afterBreak = false;
    // Step 4: a plain new line inside the text (older or imported text) starts a line too.
    text.split('\n').forEach((piece, index) => {
      if (index > 0) endLine();
      if (piece !== '') current.push({ type: 'text', value: piece });
    });
  }
  endLine();
  return lines;
}

/**
 * The plugin itself.
 *
 * @param options - the stanza label
 * @returns the tree transformer
 */
export function poemStanzas(options: PoemStanzasOptions) {
  return (tree: Root) => {
    let stanzaNumber = 0;
    for (const part of tree.children) {
      // Step 1: only top-level paragraphs of words are stanzas.
      if (part.type !== 'element' || part.tagName !== 'p') continue;
      if (part.children.some(isMedia)) continue;
      // Step 2: name the stanza for screen readers, then lay out its lines.
      stanzaNumber += 1;
      part.properties.role = 'group';
      part.properties.ariaLabel = options.stanzaLabel(stanzaNumber);
      part.children = splitPoemLines(part.children);
    }
  };
}
