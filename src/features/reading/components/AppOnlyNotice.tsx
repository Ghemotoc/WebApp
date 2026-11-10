/**
 * AppOnlyNotice: what the web reader shows in place of a chapter whose writer chose "In the app
 * only" (bundle GAPS-15; stories S1-E3-08 and S1-E4-09; board AppOnly, "This story is only in
 * the app").
 *
 * The rule: on the web an app-only story shows its cover, blurb and chapter list, never the
 * chapter text (decisions, 16 Oct 2026). The database sends no text in that case and says
 * `appOnly`, so this notice is all there is to show. It only ever appears once staff turn the
 * 'app_only_stories' switch on, which waits for the apps (Q35).
 * The board's "Get the app" and "Open in the app" buttons wait for the apps' download page and
 * deep link (S1-E16-01, S1-E16-02); until then the notice links back to the story.
 * Who uses it: ChapterReaderPage, when get_chapter() answered with `appOnly`.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { ReaderChapter } from '../api/chapter';

/**
 * Renders the notice.
 *
 * @param chapter - the chapter answer, for the story's title, language, writer and address
 * @returns the story's title as the page's H1, then the notice with a way back to the story
 */
export function AppOnlyNotice({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col gap-6">
      <title>{chapter.story.title}</title>
      <h1
        lang={chapter.story.languageCode}
        className="m-0 text-[clamp(32px,3.6vw,48px)] leading-[1.02] font-extrabold tracking-[-0.025em] break-words"
      >
        {chapter.story.title}
      </h1>
      <section
        aria-labelledby="app-only-title"
        className="flex max-w-[640px] flex-col items-start gap-2 rounded-card border border-border bg-tint px-6 py-5"
      >
        <h2 id="app-only-title" className="m-0 text-base font-semibold text-heading">
          {t('appOnly.title')}
        </h2>
        <p className="m-0 text-[15px] leading-normal text-body">
          {t('appOnly.body', { writer: chapter.story.writer.displayName })}
        </p>
        <Link
          to={`/s/${chapter.story.slug}`}
          className="mt-1 inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
        >
          {t('appOnly.backToStory')}
        </Link>
      </section>
    </div>
  );
}
