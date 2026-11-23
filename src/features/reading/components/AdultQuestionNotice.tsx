/**
 * AdultQuestionNotice: what the reader shows a visitor who isn't logged in on an 18+ story's
 * chapter, before they say they are 18 or over (bundle CALM-9m; Robert, 23 Nov 2026, 09:04 UTC;
 * build doc "Build: CALM-9 page by page", part 1, section 2).
 *
 * The rule: an 18+ story stays showable and findable, and its chapter text waits behind one
 * question: the visitor says they are 18 or over and want to see it. The answer is kept in their
 * own browser (src/lib/visitorAdult.ts) and sent with the app's requests, so get_chapter() then
 * sends the text as for any story. It says "For mature readers" and never names the rating.
 * Signed-in members never see this notice: their own age decides, and an under-18 account
 * never opens an 18+ story.
 * Who uses it: ChapterReaderPage, when get_chapter() answered with `needsAdultAnswer`.
 * What it calls next: rememberVisitorSaidAdult(), then TanStack Query refetches every read.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { rememberVisitorSaidAdult } from '@/lib/visitorAdult';

import type { ReaderChapter } from '../api/chapter';

/**
 * Renders the notice.
 *
 * @param chapter - the chapter answer, for the story's title, language, writer and address
 * @returns the story's title as the page's H1, then the question with its button
 */
export function AdultQuestionNotice({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const queryClient = useQueryClient();

  /** Keeps the answer, then asks every read again so the chapter arrives with its text. */
  function showChapter() {
    rememberVisitorSaidAdult();
    void queryClient.invalidateQueries();
  }

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
        aria-labelledby="adult-question-title"
        className="flex max-w-[640px] flex-col items-start gap-3 rounded-card border border-border bg-surface px-6 py-5"
      >
        <h2 id="adult-question-title" className="m-0 text-base font-semibold text-heading">
          {t('adultQuestion.title')}
        </h2>
        <p className="m-0 text-[15px] leading-normal text-body">
          {t('adultQuestion.body', { writer: chapter.story.writer.displayName })}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={showChapter}
            className="inline-flex min-h-11 items-center rounded-full button-main px-5 py-2 text-[15px] font-semibold"
          >
            {t('adultQuestion.confirm')}
          </button>
          <Link
            to="/sign-in"
            className="inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
          >
            {t('adultQuestion.logIn')}
          </Link>
          <Link
            to={`/s/${chapter.story.slug}`}
            className="inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
          >
            {t('adultQuestion.backToStory')}
          </Link>
        </div>
      </section>
    </div>
  );
}
