/**
 * EmbedLinkChange: "Change link" on a music or video card inside the chapter editor (bundle
 * GAPS-8; board 4.3, "Change link" on the video card).
 *
 * What it does: the button opens a link field inside the card. "Save link" checks the link here
 * first (src/lib/embed-links.ts), then our server looks the title up and saves a new card
 * (/api/embed), exactly as Insert › Video does, so a card's title always comes from the service
 * itself (S1-E3-10). The block then shows the new card in the same place. A refusal says why in
 * plain words and the old card stays; "Cancel" closes the field.
 * Who uses it: ChapterEmbedNodeView. What it calls: useEmbedAddition.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { useEmbedAddition } from '@/features/embeds/hooks/useEmbeds';
import { EMBED_SERVICE_NAMES, parseEmbedLink } from '@/lib/embed-links';

import { embedFailureMessage } from '../lib/embedFailure';

/** What the control needs. */
export interface EmbedLinkChangeProps {
  /** The chapter's row ID: the new card belongs to it. */
  chapterId: string;
  /** The card being changed, for the field's own ID. */
  embedId: string;
  /** Music or video, for the field's hint. */
  kind: 'music' | 'video';
  /** Called with the new card's ID and title once our server saved it. */
  onChanged: (card: { embedId: string; title: string }) => void;
}

/**
 * The field's open state, the link, what is wrong with it, and what "Save link" does.
 *
 * @returns the state and the ways to open, close and save
 */
function useLinkChange({ chapterId, onChanged }: EmbedLinkChangeProps) {
  const { t } = useTranslation('editor');
  const [isOpen, setOpen] = useState(false);
  const [wasChanged, setWasChanged] = useState(false);
  const [link, setLink] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const adding = useEmbedAddition();
  // A ref, not state: two key presses in the same moment must both see it.
  const isSaving = useRef(false);

  /** Opens an empty field, forgetting what the last try said. */
  function open() {
    adding.reset();
    setLink('');
    setFieldError(undefined);
    setWasChanged(false);
    setOpen(true);
  }

  /** Save: an allowed link first; then our server; the block changes only once that worked. */
  async function save() {
    // A second Enter while our server is still looking the link up would make a second card.
    if (isSaving.current) return;
    adding.reset();
    if (link.trim() === '') return setFieldError(t('embedDialog.missingLink'));
    if (parseEmbedLink(link) === null) return setFieldError(t('embedDialog.failed.not_allowed'));
    setFieldError(undefined);
    isSaving.current = true;
    const card = await adding.add({ chapterId, link }).catch(() => null);
    isSaving.current = false;
    // A refusal stays on screen (adding.error); the field keeps the link.
    if (card === null) return;
    onChanged({ embedId: card.embedId, title: card.title ?? EMBED_SERVICE_NAMES[card.service] });
    setWasChanged(true);
    setOpen(false);
  }

  const close = () => setOpen(false);
  return { isOpen, wasChanged, link, setLink, fieldError, adding, open, close, save };
}

/**
 * What the last try did, read out politely: looking the link up, changed, or why it was refused.
 *
 * @returns the status lines
 */
function ChangeStatus({ change }: { change: ReturnType<typeof useLinkChange> }) {
  const { t } = useTranslation('editor');
  const failure = change.adding.error === null ? null : embedFailureMessage(change.adding.error);
  return (
    <div aria-live="polite">
      {change.adding.isAdding && <p className="m-0 text-sm text-body">{t('embedDialog.adding')}</p>}
      {change.wasChanged && <p className="m-0 text-sm text-body">{t('embed.changed')}</p>}
      {change.isOpen && failure !== null && (
        <Notice tone="error">{t(failure.key, failure.values)}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the button and, once pressed, the link field.
 *
 * @returns the control
 */
export function EmbedLinkChange(props: EmbedLinkChangeProps) {
  const { t } = useTranslation('editor');
  const change = useLinkChange(props);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Once the link changed the field is gone, so the focus goes back to the button that opened it
  // instead of being lost (WCAG 2.4.3).
  const wasChanged = change.wasChanged;
  useEffect(() => {
    if (wasChanged) buttonRef.current?.focus();
  }, [wasChanged]);

  /** Closes the field and puts the focus back on the button that opened it. */
  function cancel() {
    change.close();
    buttonRef.current?.focus();
  }

  /** Enter in the field saves, as in a form (the editor's text is not a form). */
  function saveOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void change.save();
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          ref={buttonRef}
          variant="secondary"
          aria-expanded={change.isOpen}
          onClick={change.open}
        >
          {t('embed.changeLink')}
        </Button>
      </div>
      {change.isOpen && (
        <div className="flex flex-col gap-3">
          <TextInput
            id={`chapter-embed-link-${props.embedId}`}
            label={t('embed.changeLinkLabel')}
            type="url"
            inputMode="url"
            autoComplete="off"
            value={change.link}
            maxLength={500}
            required
            onChange={(event) => change.setLink(event.target.value)}
            onKeyDown={saveOnEnter}
            hint={t(`embedDialog.linkHint.${props.kind}`)}
            errorMessage={change.fieldError}
          />
          <div className="flex flex-wrap gap-3">
            <Button disabled={change.adding.isAdding} onClick={() => void change.save()}>
              {t('embed.changeSave')}
            </Button>
            <Button variant="secondary" disabled={change.adding.isAdding} onClick={cancel}>
              {t('embed.changeCancel')}
            </Button>
          </div>
        </div>
      )}
      <ChangeStatus change={change} />
    </div>
  );
}
