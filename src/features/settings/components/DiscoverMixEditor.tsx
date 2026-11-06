/**
 * DiscoverMixEditor: which shelves Discover shows and in what order, the setting
 * discover_shelves (stories S1-E11-03 and S1-E5-03: "the Discover mix" changes without a release).
 *
 * Shelves move with Up and Down buttons, never by dragging alone (WCAG 2.5.7); Hide and Show move a
 * shelf between the two lists. Save sends the whole order at once and keeps at least one shelf.
 * Who shows it: SettingsPage. What it calls: the change() of useSettingsAdmin.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { SettingsAdminState } from '../hooks/useSettingsAdmin';
import { discoverShelfWords } from '../lib/settingGroups';

import { SaveFeedback } from './SaveFeedback';
import { SettingsSection } from './SettingsSection';

/**
 * The list with one word moved one place.
 *
 * @param words - the shelves in order
 * @param index - the one to move
 * @param by - -1 for up, 1 for down
 * @returns a new list
 */
function moved(words: string[], index: number, by: -1 | 1): string[] {
  const next = [...words];
  const target = index + by;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target] ?? '', next[index] ?? ''];
  return next;
}

/** What one shown shelf needs. */
interface ShownShelfProps {
  word: string;
  index: number;
  total: number;
  onMove: (by: -1 | 1) => void;
  onHide: () => void;
}

/**
 * One shown shelf with its buttons.
 *
 * @returns the list item
 */
function ShownShelf({ word, index, total, onMove, onHide }: ShownShelfProps) {
  const { t } = useTranslation('settings');
  const name = t(`discover.shelves.${word}`, { defaultValue: word });
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <span className="text-sm text-ink">
        {index + 1}. {name}
      </span>
      <span className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          aria-label={t('discover.moveUp', { name })}
        >
          ↑
        </Button>
        <Button
          variant="secondary"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          aria-label={t('discover.moveDown', { name })}
        >
          ↓
        </Button>
        <Button
          variant="secondary"
          disabled={total === 1}
          onClick={onHide}
          aria-label={t('discover.hideLabel', { name })}
        >
          {t('discover.hide')}
        </Button>
      </span>
    </li>
  );
}

/**
 * The shelves not shown, each with Show.
 *
 * @returns the list, or a line saying every shelf is shown
 */
function HiddenShelves({ hidden, onShow }: { hidden: string[]; onShow: (word: string) => void }) {
  const { t } = useTranslation('settings');
  if (hidden.length === 0)
    return <p className="m-0 text-sm text-meta">{t('discover.noneHidden')}</p>;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {hidden.map((word) => {
        const name = t(`discover.shelves.${word}`, { defaultValue: word });
        return (
          <li key={word} className="max-w-full">
            {/* A long shelf name wraps on a phone instead of pushing the page sideways
                (CLAUDE.md rule 21). */}
            <Button
              variant="secondary"
              className="h-auto min-h-11 max-w-full py-2 text-left whitespace-normal"
              onClick={() => onShow(word)}
              aria-label={t('discover.showLabel', { name })}
            >
              {t('discover.show')}: {name}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Renders the editor.
 *
 * @param props.state - the settings hook's state
 * @returns the section, or nothing until the setting is read
 */
export function DiscoverMixEditor({ state }: { state: SettingsAdminState }) {
  const { t } = useTranslation('settings');
  const saved = state.settings.find((setting) => setting.key === 'discover_shelves')?.value;
  const savedWords = Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : [];
  const [words, setWords] = useState<string[]>(savedWords);
  const [isSaved, setIsSaved] = useState(false);
  const hidden = discoverShelfWords.filter((word) => !words.includes(word));
  const failure = state.failedChange?.key === 'discover_shelves' ? state.changeFailure : null;
  const change = (next: string[]) => {
    setWords(next);
    setIsSaved(false);
  };
  return (
    <SettingsSection id="discover" heading={t('sections.discover')} intro={t('discover.intro')}>
      <h3 className="m-0 text-base font-bold text-heading">{t('discover.shown')}</h3>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {words.map((word, index) => (
          <ShownShelf
            key={word}
            word={word}
            index={index}
            total={words.length}
            onMove={(by) => change(moved(words, index, by))}
            onHide={() => change(words.filter((other) => other !== word))}
          />
        ))}
      </ol>
      <h3 className="m-0 text-base font-bold text-heading">{t('discover.hidden')}</h3>
      <HiddenShelves hidden={hidden} onShow={(word) => change([...words, word])} />
      {words.length === 0 && <Notice tone="error">{t('discover.atLeastOne')}</Notice>}
      <SaveFeedback isSaved={isSaved} failure={failure} />
      <div>
        <Button
          disabled={state.isChanging || words.length === 0}
          onClick={() =>
            void state
              .change({ kind: 'value', key: 'discover_shelves', value: words })
              .then(() => setIsSaved(true))
              .catch(() => setIsSaved(false))
          }
        >
          {t('discover.save')}
        </Button>
      </div>
    </SettingsSection>
  );
}
