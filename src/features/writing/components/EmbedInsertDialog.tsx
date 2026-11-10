/**
 * EmbedInsertDialog: "Add music" or "Add a video", opened from Insert › Music or Insert › Video
 * (story S1-E3-10 criterion 1; board 4.3).
 *
 * What it does: a native <dialog> (focus stays inside, Escape closes) with one field for the
 * link. Only Spotify and Apple Music (music) or YouTube, Vimeo and Loom (video) links are
 * accepted; any of the five works from either item, and the help line names them. "Add" checks the
 * link here first (src/lib/embed-links.ts, so a wrong link is explained at once), then our server
 * fetches the title from the service and saves the card (/api/embed), and the card goes in the
 * chapter where the cursor was. A refusal says why in plain words and keeps the link.
 * Who uses it: ChapterInsertControls. What it calls: useEmbedAddition, then insertChapterEmbed()
 * (lib/chapterEmbedNode.ts).
 */
import type { Editor } from '@tiptap/react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { useEmbedAddition } from '@/features/embeds/hooks/useEmbeds';
import { EMBED_SERVICE_NAMES, parseEmbedLink } from '@/lib/embed-links';

import { useNativeDialog } from '../hooks/useNativeDialog';
import { insertChapterEmbed } from '../lib/chapterEmbedNode';
import { embedFailureMessage } from '../lib/embedFailure';
import { useEditorTranslation } from '../registerEditorTranslations';

/** Which item opened the dialog; null while it is closed. */
export type EmbedDialogKind = 'music' | 'video' | null;

/** What the dialog needs. */
export interface EmbedInsertDialogProps {
  editor: Editor;
  /** The chapter's row ID: the card belongs to it. */
  chapterId: string;
  kind: EmbedDialogKind;
  onClose: () => void;
}

/**
 * The link, what is wrong with it, the addition, and the two ways out: added (the card goes in
 * the chapter) or closed. Either way the field starts empty next time.
 *
 * @returns the link, the field's error, the addition, submit(event) and close()
 */
function useEmbedInsert(props: EmbedInsertDialogProps) {
  const { editor, chapterId, onClose } = props;
  const { t } = useEditorTranslation();
  const [link, setLink] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const adding = useEmbedAddition();

  /** Closes and empties the field for next time. */
  function close() {
    setLink('');
    setFieldError(undefined);
    adding.reset();
    onClose();
  }

  /** Add: an allowed link first; then our server, then the card, then close. */
  async function submit(event: FormEvent) {
    event.preventDefault();
    adding.reset();
    if (link.trim() === '') return setFieldError(t('embedDialog.missingLink'));
    if (parseEmbedLink(link) === null) return setFieldError(t('embedDialog.failed.not_allowed'));
    setFieldError(undefined);
    const card = await adding.add({ chapterId, link }).catch(() => null);
    // A refusal stays on screen (adding.error); the field keeps the link.
    if (card === null) return;
    const title = card.title ?? EMBED_SERVICE_NAMES[card.service];
    insertChapterEmbed(editor, { embedId: card.embedId, title });
    close();
  }

  return { link, setLink, fieldError, adding, submit, close };
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when kind is null)
 */
export function EmbedInsertDialog(props: EmbedInsertDialogProps) {
  const { t } = useEditorTranslation();
  const { link, setLink, fieldError, adding, submit, close } = useEmbedInsert(props);
  const dialogRef = useNativeDialog(props.kind !== null);
  const kind = props.kind ?? 'video';
  const failure = adding.error === null ? null : embedFailureMessage(adding.error);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chapter-embed-heading"
      onClose={close}
      className="m-auto max-h-[92vh] w-[min(92vw,480px)] overflow-y-auto rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/40"
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <h2
          id="chapter-embed-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t(`embedDialog.heading.${kind}`)}
        </h2>
        <TextInput
          id="chapter-embed-link"
          label={t('embedDialog.linkLabel')}
          type="url"
          inputMode="url"
          autoComplete="off"
          value={link}
          maxLength={500}
          required
          onChange={(event) => setLink(event.target.value)}
          hint={t(`embedDialog.linkHint.${kind}`)}
          errorMessage={fieldError}
        />
        <p className="m-0 text-sm text-body">{t('embedDialog.privacyNote')}</p>
        <div aria-live="polite">
          {adding.isAdding && <p className="m-0 text-sm text-body">{t('embedDialog.adding')}</p>}
          {failure !== null && <Notice tone="error">{t(failure.key, failure.values)}</Notice>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={adding.isAdding}>
            {t('embedDialog.add')}
          </Button>
          <Button variant="secondary" onClick={close}>
            {t('embedDialog.cancel')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
