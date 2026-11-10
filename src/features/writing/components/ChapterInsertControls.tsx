/**
 * ChapterInsertControls: the editor's insert buttons, the Insert menu and the dialogs they open
 * (stories S1-E3-09, S1-E3-10 and S1-E3-11; board 4.3; liquid glass ChapterEditor board, bundle
 * G9 WRITING, part e).
 *
 * What it holds today, after a thin divider in the toolbar:
 * - the Picture button (S1-E3-09) and the Insert menu's Drawing (S1-E3-11; a drawing is saved as
 *   a picture), shown only while the picture_uploads flag is on;
 * - the Video link button (YouTube, Vimeo or Loom, checked against the allow-list by the oembed
 *   function) and the Insert menu's Music (S1-E3-10), shown only while media_embeds is on.
 * These are the same switches the database checks (both stay off until their GO-LIVE steps).
 * The board draws Picture and Video link as toolbar buttons, so they sit in the bar; Drawing and
 * Music stay in the Insert menu, which ends with the board's note that only approved services
 * are allowed and nothing loads until a reader presses play. With both switches off there is
 * nothing at all.
 * Who uses it: EditorToolbar. What it calls: useFeatureFlags, ActionIcon, InsertMenu,
 * PictureInsertDialog, DrawingInsertDialog and EmbedInsertDialog.
 */
import type { Editor } from '@tiptap/react';
import { useState } from 'react';

import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { DrawingInsertDialog } from './DrawingInsertDialog';
import { EmbedInsertDialog, type EmbedDialogKind } from './EmbedInsertDialog';
import { InsertMenu, type InsertMenuItem } from './InsertMenu';
import { PictureInsertDialog } from './PictureInsertDialog';
import { useEditorTranslation } from '../registerEditorTranslations';

/** What the menu items open. */
interface InsertOpeners {
  openPicture: () => void;
  openDrawing: () => void;
  openEmbed: (kind: EmbedDialogKind) => void;
}

/** What the controls need. */
export interface ChapterInsertControlsProps {
  editor: Editor;
  /** The chapter's row ID, for its pictures' folder. */
  chapterId: string;
}

/**
 * The Insert menu's items, each only while its switch is on (the March value is off: nothing
 * shows while the flags are loading or unreadable). Picture and Video link have their own
 * toolbar buttons (InsertButton), so the menu keeps Drawing and Music.
 *
 * @returns the items, in the board's order, and the footnote under them
 */
function useInsertItems({ openDrawing, openEmbed }: Omit<InsertOpeners, 'openPicture'>) {
  const { t } = useEditorTranslation();
  const { isOn } = useFeatureFlags();
  const items: InsertMenuItem[] = [];
  if (isOn('picture_uploads', false)) {
    items.push({
      key: 'drawing',
      label: t('insert.drawing'),
      note: t('insert.drawingNote'),
      icon: 'pen',
      onPick: openDrawing,
    });
  }
  const hasEmbeds = isOn('media_embeds', false);
  if (hasEmbeds) {
    items.push({
      key: 'music',
      label: t('insert.music'),
      note: t('insert.musicNote'),
      icon: 'music',
      onPick: () => openEmbed('music'),
    });
  }
  return {
    items,
    footnote: hasEmbeds ? t('insert.embedFootnote') : undefined,
    hasPictures: isOn('picture_uploads', false),
    hasEmbeds,
  };
}

/**
 * One of the toolbar's own insert buttons (Picture, Video link): a 44 px round icon button with
 * its accessible name and the same name as its tooltip, like the formatting buttons.
 *
 * @returns the button
 */
function InsertButton(props: { label: string; icon: ActionIconName; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className="inline-flex size-11 items-center justify-center rounded-full text-heading hover:bg-tint"
    >
      <ActionIcon name={props.icon} size={20} aria-hidden="true" />
    </button>
  );
}

/** The three dialogs the buttons and the menu open. */
function InsertDialogs(props: {
  editor: Editor;
  chapterId: string;
  isPictureOpen: boolean;
  isDrawingOpen: boolean;
  embedKind: EmbedDialogKind;
  onClosePicture: () => void;
  onCloseDrawing: () => void;
  onCloseEmbed: () => void;
}) {
  return (
    <>
      <PictureInsertDialog
        editor={props.editor}
        chapterId={props.chapterId}
        isOpen={props.isPictureOpen}
        onClose={props.onClosePicture}
      />
      <DrawingInsertDialog
        editor={props.editor}
        chapterId={props.chapterId}
        isOpen={props.isDrawingOpen}
        onClose={props.onCloseDrawing}
      />
      <EmbedInsertDialog
        editor={props.editor}
        chapterId={props.chapterId}
        kind={props.embedKind}
        onClose={props.onCloseEmbed}
      />
    </>
  );
}

/**
 * Renders the menu and the dialogs.
 *
 * @returns the Insert button with its menu, or nothing while no item is available
 */
export function ChapterInsertControls({ editor, chapterId }: ChapterInsertControlsProps) {
  const { t } = useEditorTranslation();
  const [isPictureDialogOpen, setPictureDialogOpen] = useState(false);
  const [isDrawingDialogOpen, setDrawingDialogOpen] = useState(false);
  const [embedDialogKind, setEmbedDialogKind] = useState<EmbedDialogKind>(null);
  const { items, footnote, hasPictures, hasEmbeds } = useInsertItems({
    openDrawing: () => setDrawingDialogOpen(true),
    openEmbed: setEmbedDialogKind,
  });
  // Nothing to insert while both switches are off: no divider, no buttons, no menu.
  if (!hasPictures && !hasEmbeds) return null;
  return (
    <>
      <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-border" />
      {hasPictures && (
        <InsertButton
          label={t('insert.pictureButton')}
          icon="picture"
          onClick={() => setPictureDialogOpen(true)}
        />
      )}
      {hasEmbeds && (
        <InsertButton
          label={t('insert.videoButton')}
          icon="video"
          onClick={() => setEmbedDialogKind('video')}
        />
      )}
      {items.length > 0 && <InsertMenu items={items} footnote={footnote} />}
      <InsertDialogs
        editor={editor}
        chapterId={chapterId}
        isPictureOpen={isPictureDialogOpen}
        isDrawingOpen={isDrawingDialogOpen}
        embedKind={embedDialogKind}
        onClosePicture={() => setPictureDialogOpen(false)}
        onCloseDrawing={() => setDrawingDialogOpen(false)}
        onCloseEmbed={() => setEmbedDialogKind(null)}
      />
    </>
  );
}
