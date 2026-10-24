/**
 * Cleans HTML pasted from Word, Google Docs or a web page down to what a chapter may hold
 * (story S1-E3-02b; CLAUDE.md rule 8; board 4.3: "Pasting from Word or Google Docs keeps
 * headings, bold, italic, quotes, lists, scene breaks and links. Other formatting is removed").
 *
 * How it works: the pasted HTML is parsed into a detached document (nothing runs: no scripts,
 * no loads), then rewritten in place:
 * - scripts, styles, pictures, media, forms and comments are removed with their content;
 * - Word's list paragraphs (class MsoListParagraph or style mso-list) become real lists, the
 *   bullet glyph taken off; Google Docs' wrapper (<b style="font-weight:normal">) is unwrapped;
 * - h1 becomes h2 and h4 to h6 become h3 (the chapter's two heading sizes);
 * - non-breaking spaces become spaces.
 * ProseMirror then parses the result against the editor's schema, which only knows the allowed
 * nodes and marks (bold also from font-weight styles, italic from font-style), so whatever is
 * left over is kept as plain text. The stored Markdown is checked again on save.
 * Who calls it: useChapterEditor, through TipTap's transformPastedHTML.
 */

/** Elements removed with everything inside them: nothing of theirs belongs in a chapter. */
const REMOVED_ENTIRELY =
  'script, style, meta, link, title, head, img, picture, svg, video, audio, iframe, object, embed, canvas, form, input, button, select, textarea, noscript, template';

/** Word's list paragraphs: the class or the mso-list style marks them. */
function isWordListParagraph(element: Element): boolean {
  const className = element.getAttribute('class') ?? '';
  const style = element.getAttribute('style') ?? '';
  return /MsoListParagraph/i.test(className) || /mso-list/i.test(style);
}

/** The bullet or number Word pastes as text at the start of a list item ("·", "1.", "a)"). */
const LIST_GLYPH = /^\s*(?:[·•●○■o\-–—]|\d+[.)]|[a-z][.)]|[ivx]+[.)])\s*/i;

/** True when Word's glyph for this paragraph is a number, so the list is ordered. */
function isNumberedGlyph(element: Element): boolean {
  return /^\s*\d+[.)]/.test(element.textContent ?? '');
}

/**
 * Turns a run of Word list paragraphs into one list.
 *
 * @param paragraphs - consecutive Word list paragraphs, in order
 */
function wrapWordList(paragraphs: Element[], document: Document) {
  const first = paragraphs[0];
  if (first === undefined) return;
  const list = document.createElement(isNumberedGlyph(first) ? 'ol' : 'ul');
  first.parentNode?.insertBefore(list, first);
  for (const paragraph of paragraphs) {
    const item = document.createElement('li');
    // Word writes the glyph inside a span with a Symbol font; take the span out, then the text.
    for (const span of paragraph.querySelectorAll(
      'span[style*="font-family:Symbol"], span[style*="mso-list"]',
    )) {
      span.remove();
    }
    item.innerHTML = paragraph.innerHTML;
    const firstText = firstTextNode(item);
    if (firstText !== null) firstText.data = firstText.data.replace(LIST_GLYPH, '');
    list.append(item);
    paragraph.remove();
  }
}

/** The first text node inside an element, in document order. */
function firstTextNode(element: Element): Text | null {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  return node instanceof Text ? node : null;
}

/** Finds Word's list paragraphs and groups the consecutive ones into lists. */
function convertWordLists(document: Document) {
  const paragraphs = Array.from(document.body.querySelectorAll('p')).filter(isWordListParagraph);
  let run: Element[] = [];
  for (const paragraph of paragraphs) {
    const previous = run.at(-1);
    if (previous !== undefined && previous.nextElementSibling !== paragraph) {
      wrapWordList(run, document);
      run = [];
    }
    run.push(paragraph);
  }
  wrapWordList(run, document);
}

/** Replaces an element with another tag, keeping its children. */
function renameElement(element: Element, tagName: string, document: Document) {
  const replacement = document.createElement(tagName);
  replacement.append(...Array.from(element.childNodes));
  element.replaceWith(replacement);
}

/** Replaces an element with its children. */
function unwrapElement(element: Element) {
  element.replaceWith(...Array.from(element.childNodes));
}

/** Google Docs wraps everything in a bold element that isn't bold; Word adds <o:p> and spans. */
function unwrapWrappers(document: Document) {
  for (const element of document.body.querySelectorAll(
    'b[style*="font-weight:normal"], b[style*="font-weight: normal"]',
  )) {
    unwrapElement(element);
  }
  for (const element of document.body.querySelectorAll('o\\:p, font')) {
    unwrapElement(element);
  }
}

/** The chapter has two heading sizes: h1 is the story's own title, h4 and deeper are too small. */
function snapHeadings(document: Document) {
  for (const element of document.body.querySelectorAll('h1'))
    renameElement(element, 'h2', document);
  for (const element of document.body.querySelectorAll('h4, h5, h6'))
    renameElement(element, 'h3', document);
}

/** Comments and non-breaking spaces, which Word and Docs scatter everywhere. */
function cleanTextNodes(document: Document) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT,
  );
  const nodes: Node[] = [];
  let node = walker.nextNode();
  while (node !== null) {
    nodes.push(node);
    node = walker.nextNode();
  }
  for (const found of nodes) {
    if (found.nodeType === Node.COMMENT_NODE) found.parentNode?.removeChild(found);
    else if (found instanceof Text) found.data = found.data.replace(/\u00a0/g, ' ');
  }
}

/**
 * Whether an attribute survives the clean: a link's address, and the font-weight / font-style
 * styles ProseMirror reads as bold and italic (bold only outside headings).
 *
 * @param element - the element carrying it
 * @param attribute - the attribute
 * @param isInHeading - true inside an h2 or h3
 * @returns true to keep it
 */
function keepsAttribute(element: Element, attribute: Attr, isInHeading: boolean): boolean {
  if (element.tagName === 'A') return attribute.name === 'href';
  if (attribute.name !== 'style') return false;
  if (/font-style:\s*italic/.test(attribute.value)) return true;
  return !isInHeading && /font-weight/.test(attribute.value);
}

/**
 * Cleans pasted HTML.
 *
 * @param html - what the clipboard carried as text/html
 * @returns HTML with only what the editor's schema can keep, ready for ProseMirror to parse
 */
export function cleanPastedHtml(html: string): string {
  // Step 1: a detached document: nothing in it runs or loads.
  const document = new DOMParser().parseFromString(html, 'text/html');
  // Step 2: out go the parts that can never be chapter text.
  for (const element of document.body.querySelectorAll(REMOVED_ENTIRELY)) element.remove();
  cleanTextNodes(document);
  // Step 3: the shapes Word and Docs use become the plain shapes the schema knows.
  unwrapWrappers(document);
  convertWordLists(document);
  snapHeadings(document);
  // Step 4: every attribute goes except a link's address and the font-weight / font-style
  // styles, which ProseMirror reads as bold and italic (that is how Docs marks them).
  // A heading is already bold, so a bold style inside one (Docs writes font-weight:700 on every
  // heading span) would come back as "## **Marți**"; only italic is kept there.
  for (const element of document.body.querySelectorAll('*')) {
    const isInHeading = element.closest('h2, h3') !== null;
    for (const attribute of Array.from(element.attributes)) {
      if (!keepsAttribute(element, attribute, isInHeading)) element.removeAttribute(attribute.name);
    }
  }
  return document.body.innerHTML;
}
