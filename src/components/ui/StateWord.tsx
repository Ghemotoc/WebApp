/**
 * StateWord: one state said as a bold word ("This device", "Connected", "In review"), where an
 * information pill used to stand (bundle CALM-9d; the meta line's state rule from CALM-2,
 * design/simplified-system/components/MetaLine/README.md).
 *
 * Use it for a state that sits on its own beside a name or a heading. When the state starts a
 * line of facts, put it in a MetaLine as its first fact instead. The word always carries the
 * state, so colour is never the only cue: a plain state is ink, a deadline keeps the warning
 * colour and only an urgent safety item uses the destructive colour.
 * Who uses it: the settings, help, reports and support pages (CALM-9d). What it calls: nothing.
 */
import type { ReactNode } from 'react';

import type { MetaFactKind } from './MetaLine';

/** The classes for each kind of state; a plain fact is not a state, so it is left out. */
const stateClasses: Record<Exclude<MetaFactKind, 'fact'>, string> = {
  state: 'text-ink',
  deadline: 'text-(--warning-text)',
  urgent: 'text-destructive',
};

/**
 * Renders the word.
 *
 * @param props.children - the translated word, and an icon before it when the state needs one
 * @param props.kind - a plain state (the default), a deadline or an urgent safety item
 * @returns a bold inline word at the meta size
 */
export function StateWord({
  children,
  kind = 'state',
}: {
  children: ReactNode;
  kind?: Exclude<MetaFactKind, 'fact'>;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 type-meta leading-snug font-semibold ${stateClasses[kind]}`}
    >
      {children}
    </span>
  );
}
