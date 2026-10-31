/**
 * ChapterInsertControls: the editor's Insert menu and the dialogs its items open (stories
 * S1-E3-09 and S1-E3-10; board 4.3).
 *
 * What it holds today: Picture (S1-E3-09), shown only while the picture_uploads flag is on, and
 * Music and Video (S1-E3-10), shown only while media_embeds is on: the same switches the database
 * checks (both stay off until their GO-LIVE steps). Drawing joins with S1-E3-11. With no items
 * there is no Insert button at all; with Music or Video the menu ends with the board's note that
 * only approved services are allowed and nothing loads until a reader presses play.
 * Who uses it: ChapterEditorPage, inside the toolbar. What it calls: useFeatureFlags,
 * InsertMenu, PictureInsertDialog and EmbedInsertDialog.
 */
import type { Editor } from '@tiptap/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import musicIcon from '@/assets/icons/music.svg';
import pictureIcon from '@/assets/icons/picture.svg';
import videoIcon from '@/assets/icons/video.svg';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { EmbedInsertDialog, type EmbedDialogKind } from './EmbedInsertDialog';
import { InsertMenu, type InsertMenuItem } from './InsertMenu';
import { PictureInsertDialog } from './PictureInsertDialog';

/** What the controls need. */
export interface ChapterInsertControlsProps {
  editor: Editor;
  /** The chapter's row ID, for its pictures' folder. */
  chapterId: string;
}

/**
 * The menu's items, each only while its switch is on (the March value is off: nothing shows while
 * the flags are loading or unreadable).
 *
 * @returns the items, in the board's order
 */
function useInsertItems(openPicture: () => void, openEmbed: (kind: EmbedDialogKind) => void) {
  const { t } = useTranslation('editor');
  const { isOn } = useFeatureFlags();
  const items: InsertMenuItem[] = [];
  if (isOn('picture_uploads', false)) {
    items.push({
      key: 'picture',
      label: t('insert.picture'),
      note: t('insert.pictureNote'),
      icon: pictureIcon,
      onPick: openPicture,
    });
  }
  const hasEmbeds = isOn('media_embeds', false);
  if (hasEmbeds) {
    items.push(
      {
        key: 'music',
        label: t('insert.music'),
        note: t('insert.musicNote'),
        icon: musicIcon,
        onPick: () => openEmbed('music'),
      },
      {
        key: 'video',
        label: t('insert.video'),
        note: t('insert.videoNote'),
        icon: videoIcon,
        onPick: () => openEmbed('video'),
      },
    );
  }
  return { items, footnote: hasEmbeds ? t('insert.embedFootnote') : undefined };
}

/**
 * Renders the menu and the dialogs.
 *
 * @returns the Insert button with its menu, or nothing while no item is available
 */
export function ChapterInsertControls({ editor, chapterId }: ChapterInsertControlsProps) {
  const [isPictureDialogOpen, setPictureDialogOpen] = useState(false);
  const [embedDialogKind, setEmbedDialogKind] = useState<EmbedDialogKind>(null);
  const { items, footnote } = useInsertItems(() => setPictureDialogOpen(true), setEmbedDialogKind);
  if (items.length === 0) return null;
  return (
    <>
      <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-border" />
      <InsertMenu items={items} footnote={footnote} />
      <PictureInsertDialog
        editor={editor}
        chapterId={chapterId}
        isOpen={isPictureDialogOpen}
        onClose={() => setPictureDialogOpen(false)}
      />
      <EmbedInsertDialog
        editor={editor}
        chapterId={chapterId}
        kind={embedDialogKind}
        onClose={() => setEmbedDialogKind(null)}
      />
    </>
  );
}
