/**
 * CanvaCoverLink: "Design it in Canva (opens a new tab)" in Story settings' cover (story
 * S1-E3-12; board NewStory 4.2).
 *
 * Board values: a 48 px white pill with a #8E7B99 border, plum 15 px text and a smaller "(opens a
 * new tab)", then the note under it. The board's dashed square is a logo slot for Canva's
 * official logo from its brand kit (DoD: we never redraw a brand's logo); until that file is in
 * design/assets/ the button shows text only (docs/board-fixes.md).
 * The note says Canva's own rules apply there (the story's legal line) and that nothing is shared
 * before the writer connects.
 * Who uses it: CoverSection, only in Story settings and only while canva_covers and
 * picture_uploads are on. What it opens: /canva/start (CanvaStartPage).
 */
import { useTranslation } from 'react-i18next';

/**
 * Renders the link and its note.
 *
 * @param storyId - the story the cover is for
 * @returns the link
 */
export function CanvaCoverLink({ storyId }: { storyId: string }) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-2">
      <div>
        <a
          href={`/canva/start?story=${encodeURIComponent(storyId)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-12 flex-wrap items-center gap-x-2 rounded-full button-glass px-[22px] text-[15px] font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          {t('canva.design')}
          <span className="text-[13px] font-normal text-meta">{t('canva.newTab')}</span>
        </a>
      </div>
      <p className="m-0 text-[13px] text-meta">{t('canva.note')}</p>
    </div>
  );
}
