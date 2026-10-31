/**
 * ChapterPicture: one picture inside a chapter, as readers see it (story S1-E3-09; board 3.5).
 *
 * What it shows, by the picture's check state (S1-E10-05):
 * - passed or approved: the picture with its alt text, and a Report button under it
 *   (criterion 4; CLAUDE.md rule 6);
 * - still being checked, or waiting for a person: a quiet box saying "Picture being checked", so
 *   nobody sees an unchecked picture and nothing says why (criterion 3);
 * - removed by a moderator: "[Removed by the moderation team]" (architecture 1.7.11).
 * No doodles: the chapter reader never has them (DoD design rules).
 * Who uses it: ChapterText (the reader, the teaser and the writer's preview).
 * What it calls: the shared ReportButton (S1-E10-01), with the picture's ID.
 */
import { useTranslation } from 'react-i18next';

import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { PictureView } from '../api/pictures';

/** What the picture needs. */
export interface ChapterPictureProps {
  pictureId: string;
  alt: string;
  /** Its state and signed address; undefined when the answer didn't include it. */
  view: PictureView | undefined;
  /** False in the writer's preview, where there is nothing to report. */
  canReport: boolean;
}

/** The box shown instead of a picture that isn't visible (yet). */
function PicturePlaceholder({ title, note }: { title: string; note: string | null }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-control-border bg-paper px-6 py-8 text-center">
      <p className="m-0 text-[15px] font-semibold text-heading">{title}</p>
      {note !== null && <p className="m-0 text-sm text-meta">{note}</p>}
    </div>
  );
}

/**
 * Renders the picture or the box in its place.
 *
 * @returns a figure, never touching the text around it
 */
export function ChapterPicture({ pictureId, alt, view, canReport }: ChapterPictureProps) {
  const { t } = useTranslation();
  // A picture the answer left out, or one without an address, is treated as still in its check.
  const isVisible = view?.state === 'visible' && view.url !== null;
  let content = (
    <PicturePlaceholder
      title={t('pictures.chapter.beingChecked')}
      note={t('pictures.chapter.beingCheckedNote')}
    />
  );
  if (view?.state === 'removed') {
    content = <PicturePlaceholder title={t('pictures.chapter.removed')} note={null} />;
  } else if (isVisible) {
    content = (
      <img
        src={view.url ?? undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-auto max-w-full rounded-card"
      />
    );
  }
  return (
    <figure
      aria-label={t('pictures.chapter.figureLabel')}
      data-chapter-picture={pictureId}
      className="my-7 flex flex-col items-center gap-2"
    >
      {content}
      {isVisible && canReport && (
        <figcaption className="self-end">
          <ReportButton
            itemType="picture"
            itemReference={pictureId}
            itemLabel={t('pictures.chapter.reportLabel', { alt })}
          />
        </figcaption>
      )}
    </figure>
  );
}
