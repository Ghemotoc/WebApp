/**
 * useSharedLink: the story link a reader is sending into a chat (bundle GAPS-7, part a; board 3.6
 * Share, "Send in Messages").
 *
 * The share dialogs open "/messages?share=<path>". The path is read here and refused unless it is
 * a story, chapter or passage address (lib/storyLinks.ts), so the address bar can never put free
 * text or another website into the message box. While the parameter is there, every link between
 * chats keeps it (`query`), and it is dropped once the message is sent or the reader says
 * "Don't send" (`clear`).
 * Who calls it: MessagesPage (the notice), ChatListItem and NewChatButton (keeping the link while
 * a chat is picked) and ChatPanel (the message box). What it calls: the router's address
 * parameters.
 */
import { useSearchParams } from 'react-router';

import { linkForStoryPath, shareParameter, sharedPathFrom } from '@/lib/storyLinks';

/** What the hook gives. */
export interface SharedLink {
  /** The full link to send, or null when nothing is being shared. */
  link: string | null;
  /** What to add to an address inside Messages to keep the link: "?share=…" or "". */
  query: string;
  /** Drops the link from the address, staying on the same page. */
  clear: () => void;
}

/**
 * Reads the link being shared from the address.
 *
 * @returns the link, the query to keep it and the way to drop it
 */
export function useSharedLink(): SharedLink {
  const [searchParams, setSearchParams] = useSearchParams();
  // Step 1: only a story, chapter or passage address counts.
  const path = sharedPathFrom(searchParams.get(shareParameter));

  /** Removes the parameter without adding a step to the browser's history. */
  function clear() {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(shareParameter);
        return next;
      },
      { replace: true },
    );
  }

  if (path === null) return { link: null, query: '', clear };
  // Step 2: the full link for the message, and the query that carries it between chats.
  return {
    link: linkForStoryPath(path),
    query: `?${shareParameter}=${encodeURIComponent(path)}`,
    clear,
  };
}
