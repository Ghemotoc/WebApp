/**
 * itemAddress: where one Story Atlas item opens (stories S1-E17-30: "each opens its item";
 * S1-E17-31: a link opens what it points to; S1-E17-12: "when I choose an item, then it opens
 * with one click").
 *
 * Who calls it: components/CrossLink.tsx, components/SearchResultItem.tsx and
 * components/CharacterMentionsList.tsx. What it calls: nothing.
 */

/** The kinds of item search, links and mentions can point to. */
export type AtlasItemKind =
  'character' | 'entry' | 'chapter' | 'scene' | 'idea' | 'event' | 'marketing';

/** One item, as the database names it. */
export interface AtlasItemReference {
  kind: AtlasItemKind;
  /** An ID, a chapter's code, or a marketing field's name. */
  ref: string;
  /** A scene's chapter code; null for everything else. */
  chapter: string | null;
}

/**
 * Works out an item's address.
 *
 * @param slug - the story's address
 * @param item - the item
 * @returns the address: a character's sheet, a bible entry, a chapter's (or a scene's chapter's)
 *   editor, the idea on the Ideas page with every note shown, the timeline, or the marketing
 *   field
 */
export function itemAddress(slug: string, item: AtlasItemReference): string {
  const plan = `/plan/s/${slug}`;
  switch (item.kind) {
    case 'character':
      return `${plan}/characters/${item.ref}`;
    case 'entry':
      return `${plan}/world/${item.ref}`;
    case 'chapter':
      return `/write/s/${slug}/c/${item.ref}`;
    case 'scene':
      return `/write/s/${slug}/c/${item.chapter ?? ''}`;
    case 'idea':
      // "All", so a note already ticked done is on the page too.
      return `${plan}/ideas?show=all#atlas-idea-${item.ref}`;
    case 'event':
      return `${plan}/storyline?view=timeline`;
    case 'marketing':
      return `${plan}/marketing#atlas-marketing-${item.ref}`;
  }
}
