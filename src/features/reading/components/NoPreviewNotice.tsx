/**
 * NoPreviewNotice: what a visitor who isn't logged in sees on a 16+ or 18+ story or chapter
 * (story S1-E4-04; board 3.8, "Other state · rated 16+ or 18+").
 *
 * The rule: signed-out visitors count as under 16 (decided 23 Oct 2026, Q6), so they see nothing
 * of the story's text. They do see the story's details, its title, writer and blurb, like any
 * other story (S1-E11-36; Robert, 11 Nov 2026, replacing the S1-E4-04 "title only" criterion, so
 * board 3.8's blurb is right again). The notice names the story's real rating, and offers
 * "Log in to check if you can read it". No doodles and no icon: a plain notice.
 * Who uses it: ChapterReaderPage and StoryPage, when their read answered nothing and
 * useStoryPreview() found a hidden rating.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { HiddenStoryPreview } from '../api/storyPreview';

/**
 * Renders the notice.
 *
 * @returns the title as the page's H1, then the notice
 */
export function NoPreviewNotice({ preview }: { preview: HiddenStoryPreview }) {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col gap-6">
      <title>{preview.title}</title>
      <h1
        lang={preview.languageCode}
        className="m-0 text-[clamp(32px,3.6vw,48px)] leading-[1.02] font-extrabold tracking-[-0.025em] break-words"
      >
        {preview.title}
      </h1>
      {preview.writerName === null ? null : (
        <p className="m-0 text-base text-meta">
          {t('linkPreview.byWriter', { name: preview.writerName })}
        </p>
      )}
      {preview.blurb === '' ? null : (
        <p
          lang={preview.languageCode}
          className="m-0 max-w-[640px] text-base leading-relaxed text-body"
        >
          {preview.blurb}
        </p>
      )}
      <section
        aria-labelledby="no-preview-title"
        className="flex max-w-[640px] flex-col items-start gap-2 rounded-card border border-border bg-tint px-6 py-5"
      >
        <h2 id="no-preview-title" className="m-0 text-base font-semibold text-heading">
          {t('teaser.noPreviewTitle')}
        </h2>
        <p className="m-0 text-[15px] leading-normal text-body">
          {t(`teaser.noPreviewBody_${preview.rating}`)}
        </p>
        <Link
          to="/sign-in"
          className="mt-1 inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
        >
          {t('teaser.noPreviewLogIn')}
        </Link>
      </section>
    </div>
  );
}
