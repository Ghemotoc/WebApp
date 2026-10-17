/**
 * LegalMarkdown: shows one part of a legal text (story S1-E14-01).
 *
 * Who uses it: LegalDocumentView and LegalSectionCard.
 * What it does: renders the Markdown with react-markdown, which never renders raw HTML (CLAUDE.md
 * rule 8: real HTML text, nothing injected). remarkLegalMarks (../lib/legalMarks.ts) adds two
 * things without changing a word: a visible "After the invited test" label on lines that start
 * only after the March test, and a highlight on [placeholders] still to be decided.
 */
import type { ComponentPropsWithoutRef } from 'react';
import Markdown, { type Components } from 'react-markdown';

import { afterTheTestAttribute, remarkLegalMarks } from '../lib/legalMarks';

import { AfterTheTestLabel } from './AfterTheTestLabel';

/** What the component needs. */
interface LegalMarkdownProps {
  /** Markdown with the brand tokens already filled in. */
  markdown: string;
  /** The language of this text, which can differ from the interface (WCAG 2.2, 3.1.2). */
  language: string;
}

/** A paragraph's or list item's props, plus the attribute remarkLegalMarks sets on marked lines. */
type MarkedProps<Tag extends 'p' | 'li'> = ComponentPropsWithoutRef<Tag> & {
  [afterTheTestAttribute]?: string;
};

/**
 * A paragraph: an after-the-test line starts with the label, so the reader sees it before the words.
 *
 * @returns the paragraph
 */
function LegalParagraph({ children, ...paragraphProps }: MarkedProps<'p'>) {
  const isAfterTheTest = paragraphProps[afterTheTestAttribute] === 'true';
  return (
    <p className="m-0 leading-[1.6]" {...paragraphProps}>
      {isAfterTheTest && <AfterTheTestLabel />}
      {children}
    </p>
  );
}

/**
 * A list item, labelled the same way as a paragraph.
 *
 * @returns the list item
 */
function LegalListItem({ children, ...itemProps }: MarkedProps<'li'>) {
  const isAfterTheTest = itemProps[afterTheTestAttribute] === 'true';
  return (
    <li className="leading-[1.6] [&>p]:inline" {...itemProps}>
      {isAfterTheTest && <AfterTheTestLabel />}
      {children}
    </li>
  );
}

/**
 * Drops the syntax-tree node react-markdown passes to every element, so it never reaches the HTML.
 *
 * @param props - an element's props from react-markdown
 * @returns the same props without node
 */
function withoutNode<Props extends { node?: unknown }>(props: Props): Omit<Props, 'node'> {
  const { node, ...htmlProps } = props;
  void node;
  return htmlProps;
}

/** How each Markdown element looks; everything else keeps the browser's plain HTML. */
const legalComponents: Components = {
  p: (props) => <LegalParagraph {...withoutNode(props)} />,
  ul: (props) => <ul className="m-0 flex list-disc flex-col gap-2 pl-5" {...withoutNode(props)} />,
  li: (props) => <LegalListItem {...withoutNode(props)} />,
  // Our own links only (email addresses, S1-E14-02): the drafts hold no user text.
  a: ({ children, ...props }) => (
    <a className="text-link underline hover:text-link-hover" {...withoutNode(props)}>
      {children}
    </a>
  ),
  mark: (props) => (
    <mark
      className="rounded-sm bg-(--pill-gold-bg) px-0.5 text-(--pill-gold-text)"
      {...withoutNode(props)}
    />
  ),
};

/**
 * Renders the Markdown.
 *
 * @returns the text as real HTML
 */
export function LegalMarkdown({ markdown, language }: LegalMarkdownProps) {
  return (
    <div lang={language} className="flex flex-col gap-3 text-body">
      <Markdown remarkPlugins={[remarkLegalMarks]} components={legalComponents}>
        {markdown}
      </Markdown>
    </div>
  );
}
