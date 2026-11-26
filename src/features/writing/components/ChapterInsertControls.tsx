/**
 * ChapterInsertControls: the editor's Insert menu and the dialogs it opens (stories S1-E3-09,
 * S1-E3-10 and S1-E3-11; board D05, user story 5.5).
 *
 * The menu, in board order: Picture ("A drawing, checked before readers see it": the upload of
 * S1-E3-09, any picture but a real person, checked before readers see it), Video link (YouTube,
 * Vimeo or Loom, S1-E3-10) and Scene break (the small diamond between scenes, always there). Two
 * items the board leaves out stay after them because their stories ask for them: Draw a sketch
 * (S1-E3-11, saved as a picture) and Music (S1-E3-10); docs/board-fixes.md, D05.
 * Picture and the sketch show only while the picture_uploads switch is on, Video link and Music
 * only while media_embeds is on: the same switches the database checks (both stay off until
 * their GO-LIVE steps). The menu ends with the line on approved services while either embed shows.
 * Who uses it: EditorToolbar. What it calls: useFeatureFlags, InsertMenu, PictureInsertDialog,
 * DrawingInsertDialog and EmbedInsertDialog.
 */
import type { Editor } from '@tiptap/react';
import { useState } from 'react';

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
 * shows while the flags are loading or unreadable); Scene break is always there.
 *
 * @returns the items, in the board's order, and the line under them
 */
function useInsertItems(editor: Editor, openers: InsertOpeners) {
  const { t } = useEditorTranslation();
  const { isOn } = useFeatureFlags();
  const hasPictures = isOn('picture_uploads', false);
  const hasEmbeds = isOn('media_embeds', false);
  const sceneBreak: InsertMenuItem = {
    key: 'sceneBreak',
    label: t('insert.sceneBreak'),
    note: t('insert.sceneBreakNote'),
    icon: 'spark',
    onPick: () => editor.chain().focus().setHorizontalRule().run(),
  };
  const picture: InsertMenuItem = {
    key: 'picture',
    label: t('insert.picture'),
    note: t('insert.pictureNote'),
    icon: 'picture',
    onPick: openers.openPicture,
  };
  const video: InsertMenuItem = {
    key: 'video',
    label: t('insert.video'),
    note: t('insert.videoNote'),
    icon: 'video',
    onPick: () => openers.openEmbed('video'),
  };
  const drawing: InsertMenuItem = {
    key: 'drawing',
    label: t('insert.drawing'),
    note: t('insert.drawingNote'),
    icon: 'pen',
    onPick: openers.openDrawing,
  };
  const music: InsertMenuItem = {
    key: 'music',
    label: t('insert.music'),
    note: t('insert.musicNote'),
    icon: 'music',
    onPick: () => openers.openEmbed('music'),
  };
  // The board's three first, each kept only while its switch is on, then the two kept items.
  const items = [
    hasPictures ? picture : null,
    hasEmbeds ? video : null,
    sceneBreak,
    hasPictures ? drawing : null,
    hasEmbeds ? music : null,
  ].filter((item): item is InsertMenuItem => item !== null);
  return { items, footnote: hasEmbeds ? t('insert.embedFootnote') : undefined };
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
 * @returns the Insert button with its menu
 */
export function ChapterInsertControls({ editor, chapterId }: ChapterInsertControlsProps) {
  const [isPictureDialogOpen, setPictureDialogOpen] = useState(false);
  const [isDrawingDialogOpen, setDrawingDialogOpen] = useState(false);
  const [embedDialogKind, setEmbedDialogKind] = useState<EmbedDialogKind>(null);
  const { items, footnote } = useInsertItems(editor, {
    openPicture: () => setPictureDialogOpen(true),
    openDrawing: () => setDrawingDialogOpen(true),
    openEmbed: setEmbedDialogKind,
  });
  return (
    <>
      <InsertMenu items={items} footnote={footnote} />
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
