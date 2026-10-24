/**
 * useDeviceDraft: reads the copy of a chapter kept on this device, once, when the editor opens
 * (story S1-E3-02b).
 *
 * Who calls it: ChapterEditorPage, which waits for the answer before starting the editor, so the
 * writer's unsaved words are on screen from the first moment.
 * What it calls: lib/draftStore.ts (IndexedDB).
 */
import { useEffect, useState } from 'react';

import { readDraftOnDevice, type DeviceDraft } from '../lib/draftStore';

/**
 * Reads the device copy.
 *
 * @param code - the chapter's code
 * @returns isRead (the answer is in) and deviceDraft (null when nothing is kept)
 */
export function useDeviceDraft(code: string) {
  const [answer, setAnswer] = useState<{ code: string; draft: DeviceDraft | null } | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void readDraftOnDevice(code).then((draft) => {
      if (isCurrent) setAnswer({ code, draft });
    });
    return () => {
      isCurrent = false;
    };
  }, [code]);
  const isRead = answer !== null && answer.code === code;
  return { isRead, deviceDraft: isRead ? answer.draft : null };
}
