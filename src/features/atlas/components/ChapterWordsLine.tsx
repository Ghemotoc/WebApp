/**
 * ChapterWordsLine: the live count under the chapter text (stories S1-E17-23: "a live count
 * shows 'words / target'"; S1-E17-26: the chapter's progress shows when I view it), and the
 * warning when the chapter nears the most one chapter can hold.
 *
 * The count shows once the chapter has a target (the toolbar already counts the words without
 * one), as polite live text, so a screen reader hears it when the writer pauses, not on every key. Who uses it: ChapterEditorPage (src/features/writing). What it calls: useChapterPlan for
 * the target and lib/chapterLength.ts for the warning.
 */
import { Notice } from '@/components/ui/Notice';

import { useChapterPlan } from '../hooks/useChapterPlan';
import { isNearChapterLimit } from '../lib/chapterLength';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the line needs. */
export interface ChapterWordsLineProps {
  slug: string;
  chapterCode: string;
  wordCount: number;
  /** The characters in the text now, for the long-chapter warning. */
  characterCount: number;
}

/**
 * Renders the count and, when needed, the warning.
 *
 * @returns "1,200 / 3,000 words" when there is a target, and the warning when needed
 */
export function ChapterWordsLine(props: ChapterWordsLineProps) {
  const { t, i18n } = useAtlasTranslation();
  const { plan } = useChapterPlan(props.slug, props.chapterCode);
  const numbers = new Intl.NumberFormat(i18n.language);
  const target = plan?.fields.wordTarget ?? null;
  const words = numbers.format(props.wordCount);
  return (
    <div className="flex flex-col gap-2">
      {target !== null && (
        <p
          aria-live="polite"
          data-testid="atlas-chapter-words"
          className="m-0 text-sm font-semibold text-heading"
        >
          {t('chapterPlan.wordsOfTarget', { words, target: numbers.format(target) })}
        </p>
      )}
      {isNearChapterLimit(props.characterCount) && (
        <Notice tone="warning">{t('chapterPlan.nearLimit')}</Notice>
      )}
    </div>
  );
}
