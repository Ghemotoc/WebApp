/**
 * ChapterInsertControls: the editor's Insert menu and the dialogs its items open (story
 * S1-E3-09; board 4.3).
 *
 * What it holds today: Picture (S1-E3-09), shown only while the picture_uploads flag is on, the
 * same switch the database checks (it stays off until the real picture check is set up; GO-LIVE).
 * Drawing, Music and Video join here with S1-E3-10 and S1-E3-11. With no items there is no Insert
 * button at all.
 * Who uses it: ChapterEditorPage, inside the toolbar. What it calls: useFeatureFlags,
 * InsertMenu and PictureInsertDialog.
 */
import type { Editor } from '@tiptap/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import pictureIcon from '@/assets/icons/picture.svg';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { InsertMenu, type InsertMenuItem } from './InsertMenu';
import { PictureInsertDialog } from './PictureInsertDialog';

/** What the controls need. */
export interface ChapterInsertControlsProps {
  editor: Editor;
  /** The chapter's row ID, for its pictures' folder. */
  chapterId: string;
}

/**
 * Renders the menu and the dialogs.
 *
 * @returns the Insert button with its menu, or nothing while no item is available
 */
export function ChapterInsertControls({ editor, chapterId }: ChapterInsertControlsProps) {
  const { t } = useTranslation('editor');
  const { isOn } = useFeatureFlags();
  const [isPictureDialogOpen, setPictureDialogOpen] = useState(false);
  const items: InsertMenuItem[] = [];
  // The March value is off: no Insert › Picture while the flags are loading or unreadable.
  if (isOn('picture_uploads', false)) {
    items.push({
      key: 'picture',
      label: t('insert.picture'),
      note: t('insert.pictureNote'),
      icon: pictureIcon,
      onPick: () => setPictureDialogOpen(true),
    });
  }
  if (items.length === 0) return null;
  return (
    <>
      <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-border" />
      <InsertMenu items={items} />
      <PictureInsertDialog
        editor={editor}
        chapterId={chapterId}
        isOpen={isPictureDialogOpen}
        onClose={() => setPictureDialogOpen(false)}
      />
    </>
  );
}
