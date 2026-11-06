/**
 * Tabs: a row of tabs that shows one panel at a time (bundle AVATAR-1, 6 Nov 2026: the avatar
 * editor; PROFILE-1 reuses it for Settings › Profile).
 *
 * The WAI-ARIA tabs pattern (WCAG 2.2, 4.1.2 and 2.1.1): a tablist of buttons with role "tab",
 * the chosen one aria-selected and the only one in the Tab order; Left and Right (and Home and
 * End) move between tabs and choose them. Each tab is at least 44 px tall (CLAUDE.md rule 9:
 * 24 px minimum targets). The row scrolls sideways on a narrow screen instead of wrapping.
 * Who uses it: AvatarEditorTabs. What it calls: nothing; the caller draws the panel.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

/** One tab. */
export interface TabItem<Key extends string> {
  key: Key;
  label: string;
}

/** What the tabs need. */
export interface TabsProps<Key extends string> {
  /** Names the row for screen readers ("Parts of your avatar"). */
  label: string;
  /** Joins the ids of the tabs and the panel, so each tab names its panel. */
  idPrefix: string;
  tabs: readonly TabItem<Key>[];
  selected: Key;
  onSelect: (key: Key) => void;
  /** The chosen tab's panel. */
  children: ReactNode;
}

/**
 * Where a key press moves the choice: one tab left or right (wrapping), or the first or last.
 *
 * @returns the new tab's position, or null for a key that moves nothing
 */
function nextPosition(key: string, current: number, count: number): number | null {
  if (key === 'ArrowRight') return (current + 1) % count;
  if (key === 'ArrowLeft') return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/**
 * Renders the tabs and the chosen tab's panel.
 *
 * @returns the tab row and the panel
 */
export function Tabs<Key extends string>(props: TabsProps<Key>) {
  const { label, idPrefix, tabs, selected, onSelect, children } = props;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedPosition = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === selected),
  );

  /** Arrow keys, Home and End choose another tab and move the focus onto it. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const position = nextPosition(event.key, selectedPosition, tabs.length);
    const target = position === null ? undefined : tabs[position];
    if (position === null || target === undefined) return;
    event.preventDefault();
    onSelect(target.key);
    buttons.current[position]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab, position) => {
          const isSelected = position === selectedPosition;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                buttons.current[position] = element;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.key}`}
              aria-selected={isSelected}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tab.key)}
              onKeyDown={handleKeyDown}
              className={`-mb-px min-h-11 flex-none border-b-2 px-3.5 text-sm font-semibold whitespace-nowrap ${
                isSelected
                  ? 'border-link text-heading'
                  : 'border-transparent text-body hover:text-heading'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${idPrefix}-panel`}
        aria-labelledby={`${idPrefix}-tab-${tabs[selectedPosition]?.key ?? ''}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
