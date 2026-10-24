/**
 * LinkDialog: "Add a link", opened by the toolbar's Link button and Ctrl+K (story S1-E3-02a).
 *
 * What it does: a small native <dialog> (focus stays inside it, Escape closes it) with one
 * field for the address. Add puts the link on the selected text (or the current word); Remove
 * takes it off. Only http, https and mailto addresses are accepted (CLAUDE.md rule 8), the same
 * rule as the converters and the server, so a javascript: address never reaches the text.
 * Who uses it: ChapterEditorPage.
 */
import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import { isAllowedLink } from '../lib/chapterMarkdown';

/** What the dialog needs. */
export interface LinkDialogProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

/** What the form inside the dialog needs. */
interface LinkFormProps {
  address: string;
  hasProblem: boolean;
  canRemove: boolean;
  onAddressChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onRemove: () => void;
  onCancel: () => void;
}

/** The heading, the address field and the three buttons. */
function LinkForm(props: LinkFormProps) {
  const { t } = useTranslation('editor');
  return (
    <form onSubmit={props.onSubmit} className="flex flex-col gap-4">
      <h2 id="chapter-link-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('link.heading')}
      </h2>
      <TextInput
        id="chapter-link-address"
        label={t('link.urlLabel')}
        type="url"
        inputMode="url"
        autoComplete="off"
        value={props.address}
        onChange={(event) => props.onAddressChange(event.target.value)}
        hint={t('link.urlHint')}
        errorMessage={props.hasProblem ? t('link.invalid') : undefined}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{t('link.add')}</Button>
        {props.canRemove && (
          <Button variant="secondary" onClick={props.onRemove}>
            {t('link.remove')}
          </Button>
        )}
        <Button variant="secondary" onClick={props.onCancel}>
          {t('link.cancel')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when isOpen is false)
 */
export function LinkDialog({ editor, isOpen, onClose }: LinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [address, setAddress] = useState('');
  const [hasProblem, setHasProblem] = useState(false);

  // Step 1: open and close the native dialog as the prop changes; start from the current link.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) {
      setAddress((editor.getAttributes('link').href as string | undefined) ?? '');
      setHasProblem(false);
      dialog.showModal();
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen, editor]);

  /** Add: the address must pass the rule; the link goes on the selection or the word under it. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = address.trim();
    if (!isAllowedLink(trimmed)) {
      setHasProblem(true);
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
    onClose();
  }

  /** Remove: the text stays, the link goes. */
  function handleRemove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chapter-link-heading"
      onClose={onClose}
      className="m-auto w-[min(92vw,420px)] rounded-card border border-border bg-surface p-6 text-ink shadow-card backdrop:bg-ink/40"
    >
      <LinkForm
        address={address}
        hasProblem={hasProblem}
        canRemove={editor.isActive('link')}
        onAddressChange={(value) => {
          setAddress(value);
          setHasProblem(false);
        }}
        onSubmit={handleSubmit}
        onRemove={handleRemove}
        onCancel={onClose}
      />
    </dialog>
  );
}
