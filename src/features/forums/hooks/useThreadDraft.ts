/**
 * useThreadDraft: keeps a new thread's title and first post on this device until it is posted
 * (bundle BOOKS-7, board F04, user story 7.4: "A draft is kept on this device until it is
 * posted").
 *
 * The draft lives in the browser's localStorage under one key per forum, so a member who closes
 * the tab finds the words again next time. It never leaves the device: nothing is sent to the
 * database until "Post the thread". Storage can be missing or blocked (a private window, cleared
 * site data); every read and write is wrapped, and the form then works without a draft.
 * Who calls it: NewThreadForm. What it calls: window.localStorage only.
 */
import { useEffect, useState } from 'react';

/** What a draft holds. */
export interface ThreadDraft {
  title: string;
  body: string;
}

/** The storage key for one forum's draft. */
function draftKey(forumSlug: string): string {
  return `forum-thread-draft:${forumSlug}`;
}

/**
 * Reads a stored draft, or null when there is none or storage can't be read.
 *
 * @param forumSlug - the forum the thread goes in
 * @returns the draft, or null
 */
export function readThreadDraft(forumSlug: string): ThreadDraft | null {
  try {
    const stored = window.localStorage.getItem(draftKey(forumSlug));
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const draft = parsed as Partial<ThreadDraft>;
    return { title: String(draft.title ?? ''), body: String(draft.body ?? '') };
  } catch {
    // Storage blocked or the value unreadable: start empty.
    return null;
  }
}

/**
 * Stores the draft, or forgets it when both fields are empty.
 *
 * @param forumSlug - the forum the thread goes in
 * @param draft - what is typed now
 */
export function writeThreadDraft(forumSlug: string, draft: ThreadDraft): void {
  try {
    const isEmpty = draft.title.trim() === '' && draft.body.trim() === '';
    if (isEmpty) window.localStorage.removeItem(draftKey(forumSlug));
    else window.localStorage.setItem(draftKey(forumSlug), JSON.stringify(draft));
  } catch {
    // Storage blocked: the words stay in the form for this visit only.
  }
}

/**
 * Holds the title and the post, starting from the stored draft, and stores each change.
 *
 * @param forumSlug - the forum the thread goes in ('' while none is picked: nothing is stored)
 * @param initialBody - words to start the post with when there is no draft (a chapter passage)
 * @returns the title and body with their setters, and forget() for after posting or leaving
 */
export function useThreadDraft(forumSlug: string, initialBody: string) {
  const [draft, setDraft] = useState<ThreadDraft>(() => {
    const stored = forumSlug === '' ? null : readThreadDraft(forumSlug);
    return stored ?? { title: '', body: initialBody };
  });
  // Every change is stored under the forum picked now.
  useEffect(() => {
    if (forumSlug !== '') writeThreadDraft(forumSlug, draft);
  }, [forumSlug, draft]);
  return {
    title: draft.title,
    body: draft.body,
    setTitle: (title: string) => setDraft((current) => ({ ...current, title })),
    setBody: (body: string) => setDraft((current) => ({ ...current, body })),
    forget: () => writeThreadDraft(forumSlug, { title: '', body: '' }),
  };
}
