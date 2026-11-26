/**
 * HighlightedSnippet: a search result's snippet with the matches marked (story S1-E17-30: "with
 * a snippet and the match highlighted (not by colour alone)").
 *
 * Each match is a <mark> on the honey tint, as board E34 draws it (user stories bundle 6, story
 * 6.15; a soft honey, never strong yellow), and in bold, so it stands out without relying on colour.
 * Who uses it: SearchResultItem. What it calls: lib/highlightMatches.ts.
 */
import { highlightMatches } from '../lib/highlightMatches';

/**
 * Renders the snippet.
 *
 * @param props.snippet - the text around the match, from the database
 * @param props.query - what the writer searched for
 * @returns the snippet's pieces, to sit inside the caller's paragraph
 */
export function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  return (
    <>
      {highlightMatches(snippet, query).map((part, place) =>
        part.isMatch ? (
          <mark key={place} className="bg-gold px-1 font-semibold text-on-gold">
            {part.text}
          </mark>
        ) : (
          <span key={place}>{part.text}</span>
        ),
      )}
    </>
  );
}
