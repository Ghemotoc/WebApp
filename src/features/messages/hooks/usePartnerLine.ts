/**
 * usePartnerLine: the words under the other person's name in a chat, from their latest story the
 * reader may read (user story 4.3, board E13-Chat: "Fiction writer · The Salt Mine Choir, 15
 * chapters").
 *
 * The kind of writer comes from that story's category (fiction, poetry or essays); the database
 * picks the story (chat_partner_story(), through conversation_with()), so the line never names a
 * story the reader couldn't open. Someone with no readable story gets no line.
 * Who calls it: ChatHeader (the whole line) and ChatFocusBar (the kind of writer only, as the
 * phone board draws it). What it calls: the messages translations.
 */
import type { Conversation } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';

/** The categories that have their own words; any other reads "Writer". */
const knownCategories = new Set(['fiction', 'poetry', 'nonfiction_essays']);

/** The two lengths of the line. */
export interface PartnerLine {
  /** "Fiction writer", or null when there is no story to go by. */
  kind: string | null;
  /** "Fiction writer · The Salt Mine Choir, 15 chapters", or null. */
  full: string | null;
}

/**
 * Builds the line for a chat.
 *
 * @param chat - the open chat
 * @returns the short and the long line, both null without a readable story
 */
export function usePartnerLine(chat: Conversation): PartnerLine {
  const { t } = useMessagesTranslation();
  const story = chat.latestStory;
  if (story === null) return { kind: null, full: null };
  const category = story.categorySlug ?? '';
  const kind = t(`header.kind.${knownCategories.has(category) ? category : 'other'}`);
  const work = t('header.story', { title: story.title, count: story.chapterCount });
  return { kind, full: `${kind} · ${work}` };
}
