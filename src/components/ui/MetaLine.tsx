/**
 * MetaLine: the line of facts under a title, joined by middots ("Draft · Chapter 8 · edited 2
 * hours ago"), which replaces information pills on the simplified pages (bundle CALM-2; Robert's
 * pick, 20 Nov 2026, 10:07 to 10:18 UTC; design/simplified-system/components/MetaLine/README.md).
 *
 * Each fact is its own list item, so a screen reader reads the words and never the dots: the
 * middot is drawn by CSS (.meta-line in src/styles/index.css). Inter 13/18 in the body colour.
 * A state that changes (Draft, Published, Ongoing, Due tomorrow) goes first and is bold in ink;
 * only a deadline keeps a colour (--warning-text) and only an urgent safety item uses
 * --destructive. The word always carries the state, so colour is never the only cue.
 * Filter chips and a writer's rank pill are not meta lines and stay as they are.
 * Who uses it: the drawn pages, as CALM-5 and CALM-7 rebuild them (InfoPill stays on the pages that
 * are not drawn yet). What it calls: nothing.
 */

/** How a fact is drawn: a plain fact, a state, a deadline or an urgent safety item. */
export type MetaFactKind = 'fact' | 'state' | 'deadline' | 'urgent';

/** One fact in the line. */
export interface MetaFact {
  /** The words, already translated ("15 chapters"). */
  text: string;
  /** How it is drawn; a plain fact when left out. */
  kind?: MetaFactKind;
}

/** What the line needs. */
export interface MetaLineProps {
  /** The facts, in reading order; put a state first. Empty facts are skipped. */
  facts: readonly MetaFact[];
  /** Extra classes, such as a margin. */
  className?: string;
  /** The list's accessible name, when a screen reader needs one ("Story numbers"). */
  label?: string;
}

/** The classes for each kind of fact. */
const factClasses: Record<MetaFactKind, string> = {
  fact: '',
  state: 'font-bold text-ink',
  deadline: 'font-bold text-(--warning-text)',
  urgent: 'font-bold text-destructive',
};

/**
 * Renders the facts as one quiet line.
 *
 * @param props.facts - the facts to show
 * @param props.className - extra classes
 * @param props.label - the list's accessible name, if any
 * @returns a list styled as one line, or nothing when there are no facts
 */
export function MetaLine({ facts, className, label }: MetaLineProps) {
  // Step 1: leave out facts with no words, so the line never shows two dots in a row.
  const shownFacts = facts.filter((fact) => fact.text.trim() !== '');
  if (shownFacts.length === 0) return null;
  // Step 2: one list item per fact; CSS draws the middot before every item but the first.
  return (
    <ul aria-label={label} className={`meta-line ${className ?? ''}`.trim()}>
      {shownFacts.map((fact, index) => (
        <li key={`${index}-${fact.text}`} className={factClasses[fact.kind ?? 'fact']}>
          {fact.text}
        </li>
      ))}
    </ul>
  );
}
