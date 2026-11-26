/**
 * emphasisedWords: splits a notification's sentence so the titles in it can be bold (user story
 * 4.1: "Each row says who did what, with the words that matter" set apart; board
 * E11-Notifications: "published Chapter 15 of <b>The Salt Mine Choir</b>").
 *
 * The titles come from the notification itself (its story, space and forum thread), never from
 * guessing at the words, so only a real title is ever bold. Each title is bold where it first
 * appears; the rest of the sentence stays as written.
 * Who calls it: NotificationRow. What it calls: nothing.
 */
import type { AppNotification } from '../api/notifications';

/** One piece of the sentence: plain words, or a title to set in bold. */
export interface SentencePiece {
  text: string;
  isTitle: boolean;
}

/**
 * The titles a notification names, longest first so a short title inside a longer one never
 * splits it.
 *
 * @param notification - the row
 * @returns the non-empty titles
 */
export function titlesOf(notification: AppNotification): string[] {
  const titles = [
    notification.story?.title,
    notification.space?.name,
    notification.forumThread?.title,
  ].filter((title): title is string => title !== undefined && title.trim() !== '');
  return [...new Set(titles)].sort((first, second) => second.length - first.length);
}

/**
 * Splits a sentence around the first place each title appears.
 *
 * @param sentence - the row's words
 * @param titles - the titles to set apart
 * @returns the pieces in order; one plain piece when no title appears
 */
export function emphasisedWords(sentence: string, titles: string[]): SentencePiece[] {
  let pieces: SentencePiece[] = [{ text: sentence, isTitle: false }];
  for (const title of titles) {
    pieces = pieces.flatMap((piece) => splitAround(piece, title));
  }
  return pieces.filter((piece) => piece.text !== '');
}

/** Splits one plain piece around the first place a title appears; titles stay as they are. */
function splitAround(piece: SentencePiece, title: string): SentencePiece[] {
  if (piece.isTitle) return [piece];
  const at = piece.text.indexOf(title);
  if (at === -1) return [piece];
  return [
    { text: piece.text.slice(0, at), isTitle: false },
    { text: title, isTitle: true },
    { text: piece.text.slice(at + title.length), isTitle: false },
  ];
}
