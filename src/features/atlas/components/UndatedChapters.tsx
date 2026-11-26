/**
 * UndatedChapters: "Chapters without a date" beside the timeline (story S1-E17-20; redrawn by
 * user stories bundle 6, story 6.10, board E29: "chapters without one are counted under the
 * list, with Show them").
 *
 * A hint, then one line naming them ("Chapters 2, 3 and 13", with a prologue or an epilogue by
 * its name), and a text button, Show them, that opens the list of links to each one's plan so
 * the writer can date it. When every chapter is dated it says so instead.
 * Who uses it: TimelineView. What it calls: lib/timeline.ts (undatedChapters), via its props.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import type { StorylineChapter } from '../api/storyline';
import { chapterNumbers } from '../lib/boardColumns';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the section needs. */
export interface UndatedChaptersProps {
  slug: string;
  /** Every chapter of the story, in book order (the numbers count from these). */
  chapters: StorylineChapter[];
  /** The chapters still without a sort value, in book order. */
  undated: StorylineChapter[];
  labelOf: (code: string) => string;
}

/**
 * Builds the line that names the undated chapters: "Chapters 2, 3 and 13", "Prologue and
 * Chapter 4". Numbered chapters share one "Chapters"; the others go by their label.
 */
function useUndatedLine({ chapters, undated, labelOf }: UndatedChaptersProps): string {
  const { t, i18n } = useAtlasTranslation();
  const numbers = chapterNumbers(chapters);
  // The reader's own "a, b and c" (Intl.ListFormat), so Romanian reads "a, b și c".
  const listFormat = new Intl.ListFormat(i18n.language, { style: 'long', type: 'conjunction' });
  const numbered: string[] = [];
  const named: string[] = [];
  for (const chapter of undated) {
    const number = numbers.get(chapter.code);
    if (number === undefined) named.push(labelOf(chapter.code));
    else numbered.push(String(number));
  }
  const parts = [...named];
  if (numbered.length > 0) {
    const list = listFormat.format(numbered);
    parts.push(t('storyline.timeline.undatedNumbers', { count: numbered.length, list }));
  }
  return listFormat.format(parts);
}

/** The hint, the line naming them, Show them and, once shown, the links. */
function UndatedBody(props: UndatedChaptersProps) {
  const { t } = useAtlasTranslation();
  const { slug, undated, labelOf } = props;
  const [isShown, setIsShown] = useState(false);
  const listId = useId();
  const line = useUndatedLine(props);
  const toggleLabel = isShown
    ? t('storyline.timeline.hideUndated')
    : t('storyline.timeline.showUndated');
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 type-meta text-ink-muted">{t('storyline.timeline.undatedHint')}</p>
      <p className="m-0 type-body text-ink">{line}</p>
      <button
        type="button"
        aria-expanded={isShown}
        aria-controls={listId}
        onClick={() => setIsShown(!isShown)}
        className={buttonClassName({ variant: 'text' }, 'self-start')}
      >
        {toggleLabel}
      </button>
      {isShown && (
        <ul
          id={listId}
          aria-labelledby="atlas-undated-heading"
          className="m-0 flex list-none flex-col p-0"
        >
          {undated.map((chapter) => (
            <li key={chapter.code} className="border-t border-hairline py-3">
              <Link
                to={`/write/s/${slug}/c/${chapter.code}`}
                className="type-label font-semibold break-words text-ink-heading no-underline hover:underline"
              >
                {labelOf(chapter.code)}:{' '}
                {chapter.title === '' ? t('storyline.board.untitled') : chapter.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the section with its heading, then the undated chapters or a line saying there are none
 */
export function UndatedChapters(props: UndatedChaptersProps) {
  const { t } = useAtlasTranslation();
  return (
    <section
      aria-labelledby="atlas-undated-heading"
      className="flex flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-undated-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('storyline.timeline.undatedHeading')}
      </h2>
      {props.undated.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('storyline.timeline.undatedNone')}</p>
      )}
      {props.undated.length > 0 && <UndatedBody {...props} />}
    </section>
  );
}
