/**
 * The elements each kind of member text may draw, used with SafeMarkdown (QA-5, finding R3).
 * Kept in its own file so SafeMarkdown.tsx exports only components (fast refresh).
 * Who uses it: CommentText, ForumPostText, BibleMarkdown and ChapterText.
 */

/** The elements each kind of member text may contain. */
export const safeMarkdownElements = {
  /** A comment: paragraphs, line breaks, bold, italic and links (S1-E6-01). */
  comment: ['p', 'br', 'strong', 'em', 'a'],
  /** A forum post: a comment's elements plus quotes and lists (S1-E8-02). */
  forumPost: ['p', 'br', 'strong', 'em', 'a', 'blockquote', 'ul', 'ol', 'li'],
  /** A Story world entry: a forum post's elements plus headings (S1-E17). */
  storyWorldEntry: [
    'p',
    'br',
    'strong',
    'em',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
  ],
  /** A chapter (ADR 0005; img only for pictures and cards, S1-E3-09, S1-E3-10). */
  chapter: [
    'p',
    'h2',
    'h3',
    'strong',
    'em',
    'blockquote',
    'ul',
    'ol',
    'li',
    'hr',
    'a',
    'br',
    'img',
  ],
} as const;
