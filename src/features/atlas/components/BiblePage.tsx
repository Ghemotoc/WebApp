/**
 * BiblePage: /plan/s/:storySlug/world and …/world/:entryId, a story's world (once called its bible;
 * renamed "Story world" on 2 Nov 2026, ADMIN-2a2; the code keeps the name "bible") in Story Atlas
 * (stories S1-E17-17 and S1-E17-18).
 *
 * The Story Atlas top bar, the heading with "New entry" under it, then the contents (every
 * section and its entries) and beside them either the open entry or "Manage sections" (user
 * stories bundle 6, story 6.8, board E27). "New entry" makes an entry and opens it ready to write
 * (?edit). On a phone the contents are their own screen: an open entry hides them and shows
 * "Sections" to go back. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryBible → story_bible() and the bible functions; useMyStories for the top bar.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryBible } from '../api/bible';
import { useStoryBible } from '../hooks/useStoryBible';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasFrame } from './AtlasFrame';
import { BibleContents } from './BibleContents';
import { BibleEntryView } from './BibleEntryView';
import { BibleSectionsManager } from './BibleSectionsManager';

/** "Sections": on a phone, the way back from an open entry to the list (board E27). */
function BackToSections({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  return (
    <Link
      to={`/plan/s/${slug}/world`}
      className={buttonClassName({ variant: 'text' }, 'gap-2 self-start lg:hidden')}
    >
      <ChevronLeftIcon size={16} />
      {t('bible.contents.heading')}
    </Link>
  );
}

/** The open entry, or a plain note when it no longer exists. */
function OpenEntry({ slug, bible, entryId }: { slug: string; bible: StoryBible; entryId: string }) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const changers = useStoryBible(slug);
  const entry = bible.entries.find((candidate) => candidate.id === entryId);
  if (entry === undefined) return <Notice tone="info">{t('bible.entryNotFound')}</Notice>;
  return (
    <BibleEntryView
      key={entry.id}
      bible={bible}
      entry={entry}
      startsEditing={searchParams.has('edit')}
      save={async (change) => changers.saveEntry(entry.id, change)}
      remove={async () => {
        await changers.removeEntry(entry.id);
        await navigate(`/plan/s/${slug}/world`);
      }}
    />
  );
}

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
  const changers = useStoryBible(slug);
  const bibleAddress = `/plan/s/${slug}/world`;
  // Story 6.8: on a phone the sections list is its own screen, so an open entry hides it.
  const contentsClass = entryId === undefined ? 'flex' : 'hidden lg:flex';

  /** "New entry in …": makes one with the default title and opens it for writing. */
  async function createEntry(sectionId: string) {
    const newId = await changers.createEntry(sectionId, t('bible.contents.newEntryName'));
    await navigate(`${bibleAddress}/${newId}?edit`);
  }

  return (
    // Board E27: a 240 px list beside the entry; 32 px between them, the scale's step under 40.
    <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className={`${contentsClass} min-w-0 flex-col`}>
        <BibleContents
          slug={slug}
          bible={bible}
          openEntryId={entryId}
          onCreateEntry={createEntry}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        {entryId !== undefined && <BackToSections slug={slug} />}
        {entryId === undefined && <p className="m-0 type-body text-ink-muted">{t('bible.pick')}</p>}
        {entryId !== undefined && <OpenEntry slug={slug} bible={bible} entryId={entryId} />}
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
 * "New entry", the page's one main button (board E27): it makes an entry in the open entry's
 * section, or in the first section, and opens it ready to write. A story with no section has
 * nowhere to put one, so the button waits until a section exists.
 */
function NewEntryButton({
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
  const changers = useStoryBible(slug);
  const [failed, setFailed] = useState(false);
  const openEntry = bible.entries.find((candidate) => candidate.id === entryId);
  const sectionId = openEntry?.sectionId ?? bible.sections[0]?.id;
  if (sectionId === undefined) return null;

  /** Makes the entry and opens it, or says plainly that it couldn't. */
  async function create(inSection: string) {
    setFailed(false);
    try {
      const newId = await changers.createEntry(inSection, t('bible.contents.newEntryName'));
      await navigate(`/plan/s/${slug}/world/${newId}?edit`);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <Button onClick={() => void create(sectionId)}>
        <ActionIcon name="plus" />
        {t('bible.contents.newEntryName')}
      </Button>
      <div aria-live="polite" className="basis-full">
        {failed && <Notice tone="error">{t('bible.contents.createFailed')}</Notice>}
      </div>
    </>
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
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section="bible"
      showsChrome={userId !== null}
    >
      <title>
        {bible ? t('bible.documentTitle', { title: bible.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId === null && <p className="m-0 text-ink-muted">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {bible === null && <Notice tone="error">{t('notFound')}</Notice>}
      {bible !== undefined && bible !== null && (
        <>
          <AtlasPageHeading
            title={t('bible.heading')}
            action={<NewEntryButton slug={storySlug} bible={bible} entryId={entryId} />}
          />
          <BibleBody slug={storySlug} bible={bible} entryId={entryId} />
        </>
      )}
    </AtlasFrame>
  );
}
