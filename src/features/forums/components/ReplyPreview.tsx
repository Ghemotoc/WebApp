/**
 * ReplyPreview: a reply as it will look once posted (bundle GAPS-9; story S1-E8-02;
 * design/boards/Thread.dc.html: "Preview" beside "Post reply").
 *
 * The words are drawn with ForumPostText, the same component a posted reply uses, so bold,
 * italic, links, quotes and lists look exactly as they will, and anything the forums never draw
 * (raw HTML, pictures) is already left out here. Nothing is sent: the preview is made on the
 * reader's device from what is in the box, and follows the box as they keep typing.
 * Who uses it: ReplyForm. What it calls: ForumPostText.
 */
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumPostText } from './ForumPostText';

/** The preview region's id, which the "Preview" button names with aria-controls. */
export const replyPreviewId = 'reply-preview';

/**
 * Renders the preview.
 *
 * @param props.text - what is in the reply box now
 * @returns the labelled region
 */
export function ReplyPreview({ text }: { text: string }) {
  const { t } = useForumsTranslation();
  return (
    <section
      id={replyPreviewId}
      aria-labelledby="reply-preview-heading"
      className="flex flex-col gap-2 rounded-2xl border border-dashed border-control-border bg-paper px-[18px] py-3.5"
    >
      <h3 id="reply-preview-heading" className="eyebrow m-0">
        {t('reply.previewHeading')}
      </h3>
      {text.trim() === '' ? (
        <p className="m-0 text-[15px] text-meta">{t('reply.previewEmpty')}</p>
      ) : (
        <ForumPostText text={text} />
      )}
    </section>
  );
}
