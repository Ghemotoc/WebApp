/**
 * TagNames: a story's tags as one line of text, "Fantezie · Familie", each in the interface
 * language (CMS-1e).
 *
 * Who shows it: WriterStoryCard and StoryPreviewAside (src/features/writing/components/).
 * What it calls: useTagCatalogue().
 */
import { useTagCatalogue } from '../hooks/useTagCatalogue';

/**
 * Renders the names.
 *
 * @returns the tags joined with a middle dot
 */
export function TagNames({ tags }: { tags: string[] }) {
  const { showTag } = useTagCatalogue();
  return <>{tags.map(showTag).join(' · ')}</>;
}
