/**
 * BiblePage: /plan/s/:storySlug/world and …/world/:entryId, a story's world (once called its bible;
 * renamed "Story world" on 2 Nov 2026, ADMIN-2a2; the code keeps the name "bible") in Story Atlas
 * (stories S1-E17-17 and S1-E17-18).
 *
 * The Story Atlas top bar, then the contents (every section and its entries) and, beside them on
 * a laptop or below on a phone, either the open entry or "Manage sections". "New entry" makes an
 * entry and opens it ready to write (?edit). Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryBible → story_bible() and the bible functions; useMyStories for the top bar.
 */
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryBible } from '../api/bible';
import { useStoryBible } from '../hooks/useStoryBible';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasTopBar } from './AtlasTopBar';
import { BibleContents } from './BibleContents';
import { BibleEntryView } from './BibleEntryView';
import { BibleSectionsManager } from './BibleSectionsManager';

/** The contents and the right-hand side: the open entry, or the section manager. */
function BibleBody({
  slug,
  bible,
  entryId,
}: {
  slug: string;
  bible: StoryBible;
  entryId: string | undefined;
}) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const changers = useStoryBible(slug);
  const bibleAddress = `/plan/s/${slug}/world`;
  const entry = bible.entries.find((candidate) => candidate.id === entryId);

  /** "New entry": makes one with the default title and opens it for writing. */
  async function createEntry(sectionId: string) {
    const newId = await changers.createEntry(sectionId, t('bible.contents.newEntryName'));
    await navigate(`${bibleAddress}/${newId}?edit`);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <BibleContents slug={slug} bible={bible} openEntryId={entryId} onCreateEntry={createEntry} />
      <div className="flex min-w-0 flex-col gap-4">
        {entryId === undefined && <p className="m-0 text-body">{t('bible.pick')}</p>}
        {entryId !== undefined && entry === undefined && (
          <Notice tone="info">{t('bible.entryNotFound')}</Notice>
        )}
        {entry !== undefined && (
          <BibleEntryView
            key={entry.id}
            bible={bible}
            entry={entry}
            startsEditing={searchParams.has('edit')}
            save={async (change) => changers.saveEntry(entry.id, change)}
            remove={async () => {
              await changers.removeEntry(entry.id);
              await navigate(bibleAddress);
            }}
          />
        )}
        {entryId === undefined && (
          <BibleSectionsManager
            bible={bible}
            addSection={changers.addSection}
            renameSection={changers.renameSection}
            moveSection={changers.moveSection}
            removeSection={changers.removeSection}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the bible page, a wait or a plain message
 */
export function BiblePage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '', entryId } = useParams();
  const { userId, isKnown } = useSession();
  const { bible, loadFailed } = useStoryBible(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>
        {bible ? t('bible.documentTitle', { title: bible.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="bible" />
      )}
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {bible === null && <Notice tone="error">{t('notFound')}</Notice>}
      {bible !== undefined && bible !== null && (
        <>
          <AtlasPageHeading title={t('bible.heading')} />
          <BibleBody slug={storySlug} bible={bible} entryId={entryId} />
        </>
      )}
    </PageContainer>
  );
}
