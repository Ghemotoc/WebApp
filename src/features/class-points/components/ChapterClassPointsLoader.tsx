/**
 * ChapterClassPointsLoader: a small step between the chapter reader and the class points section
 * (bundle BOOKS-8, which keeps the chapter reader within its download budget).
 *
 * Why: when a lazy file is fetched, Vite also fetches every file it needs, and the list of those
 * files is written into the file that asks for it. Asked for straight from the reader, the class
 * points section put a list of about 75 files into the reader's own download. This loader needs
 * only React, so the reader carries a short list; the long one lives here and is read only when a
 * signed-in reader nears the end of a chapter (scripts/check-bundle-size.ts measures the reader).
 * Who shows it: ChapterClassPointsWhenNear. What it shows: ChapterClassPoints, once it has loaded.
 */
import { lazy, Suspense } from 'react';

/** The section, in its own file. */
const ChapterClassPoints = lazy(async () => {
  const module = await import('./ChapterClassPoints');
  return { default: module.ChapterClassPoints };
});

/**
 * Renders the section once its file has arrived.
 *
 * @param props.chapterId - the chapter's row ID
 * @returns the section, or nothing while it loads
 */
export function ChapterClassPointsLoader({ chapterId }: { chapterId: string }) {
  return (
    <Suspense fallback={null}>
      <ChapterClassPoints chapterId={chapterId} />
    </Suspense>
  );
}
