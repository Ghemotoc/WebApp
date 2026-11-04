/**
 * DiscussPassageButton: "Discuss in the forums" in the reader's selection bar (bundle 14d IDEAS-3,
 * part f; idea IDEA-20261102-10, criterion 1).
 *
 * It opens the new-thread form in "Book talk" with the passage quoted and a link back to it. The
 * reader writes the title and their own words before posting; nothing is posted by the button.
 * It shows only when passage_discussion_allowed() said yes (a public story, the writer's passage
 * switch on; criterion 2) and the selection fits a quote card (at most 280 characters and five
 * blocks), so the copy limits stay as sharing already has them.
 * Who uses it: QuoteShareBar. What it calls: lib/passageThread.ts, then the router opens
 * /forums/book-talk/new (NewThreadPage reads the draft from the router's state).
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { MAXIMUM_SHARED_BLOCKS } from '@/lib/chapter-blocks';

import type { QuoteSelection } from '../lib/quoteSelection';
import { passageForumSlug, passageThreadBody, type PassageThreadDraft } from '../lib/passageThread';
import type { SharedChapter } from '../lib/sharedChapter';

/**
 * Renders the button.
 *
 * @param props.chapter - the chapter being read
 * @param props.selection - what the reader selected
 * @returns the button, or nothing when the passage is too long for a quote or its blocks can't
 *   be told
 */
export function DiscussPassageButton({
  chapter,
  selection,
}: {
  chapter: SharedChapter;
  selection: QuoteSelection;
}) {
  const { t } = useTranslation('sharing');
  const navigate = useNavigate();
  const blocks = selection.blocks;
  // The same limits as a quote card and a passage link: nothing longer leaves the chapter.
  if (!selection.fits || blocks === null) return null;
  if (blocks.last - blocks.first >= MAXIMUM_SHARED_BLOCKS) return null;

  /** Opens the new-thread form with the passage and the link already in it. */
  function discuss() {
    if (blocks === null) return;
    const linkText = t('button.discussFrom', {
      number: chapter.chapterNumber,
      title: chapter.storyTitle,
    });
    const draft: PassageThreadDraft = {
      initialBody: passageThreadBody(selection.passage, linkText, {
        address: chapter.address,
        blocks,
      }),
    };
    void navigate(`/forums/${passageForumSlug}/new`, { state: draft });
  }

  return (
    <Button variant="secondary" onMouseDown={(event) => event.preventDefault()} onClick={discuss}>
      {t('button.discuss')}
    </Button>
  );
}
