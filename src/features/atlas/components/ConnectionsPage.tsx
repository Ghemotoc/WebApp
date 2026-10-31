/**
 * ConnectionsPage: /plan/s/:storySlug/connections, how a story's characters are connected in
 * Story Atlas (stories S1-E17-14 to S1-E17-16).
 *
 * The Story Atlas top bar, then four cards: Add a relationship (both characters picked here), the
 * relationship map, the family tree and All relationships, which is also the map's list version
 * for screen readers (S1-E17-15). With fewer than two characters it points to the Characters page
 * instead. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryCast → story_cast(), useRelationshipChangers → the relationship functions, and
 * useMyStories for the top bar.
 */
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useStoryCast } from '../hooks/useStoryCast';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddRelationshipForm } from './AddRelationshipForm';
import { AtlasTopBar } from './AtlasTopBar';
import { FamilyTreeView } from './FamilyTreeView';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { RelationshipList } from './RelationshipList';
import { RelationshipMap } from './RelationshipMap';

/** One of the page's cards, with its heading and an optional hint. */
function ConnectionsCard({
  id,
  heading,
  hint,
  children,
}: {
  id: string;
  heading: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2 id={id} className="m-0 font-heading text-[22px] font-bold text-heading">
        {heading}
      </h2>
      {hint !== undefined && <p className="m-0 text-sm text-meta">{hint}</p>}
      {children}
    </section>
  );
}

/** The four cards, or the pointer to the Characters page. */
function ConnectionsBody({ slug, cast }: { slug: string; cast: StoryCast }) {
  const { t } = useAtlasTranslation();
  const { relate, unrelate } = useRelationshipChangers(slug);
  const words = useRelationshipWords(cast);
  // Each node and box opens that character's sheet.
  const sheetAddress = (characterId: string) => `/plan/s/${slug}/characters/${characterId}`;
  if (cast.characters.length < 2) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body">{t('connections.noCharacters')}</p>
        <Link to={`/plan/s/${slug}/characters`} className="self-start font-semibold text-link">
          {t('connections.openCharacters')}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ConnectionsCard id="atlas-add-relationship-heading" heading={t('connections.add.heading')}>
        <AddRelationshipForm idPrefix="atlas-relationship" cast={cast} onAdd={relate} />
      </ConnectionsCard>
      <ConnectionsCard
        id="atlas-map-heading"
        heading={t('connections.map.heading')}
        hint={t('connections.map.hint')}
      >
        <RelationshipMap addressOf={sheetAddress} cast={cast} words={words} />
      </ConnectionsCard>
      <ConnectionsCard
        id="atlas-tree-heading"
        heading={t('connections.tree.heading')}
        hint={t('connections.tree.hint')}
      >
        <FamilyTreeView addressOf={sheetAddress} cast={cast} words={words} />
      </ConnectionsCard>
      <ConnectionsCard id="atlas-all-relationships-heading" heading={t('connections.list.heading')}>
        <RelationshipList
          relationships={cast.relationships}
          words={words}
          onDelete={unrelate}
          extra={(relationship, sentence) => (
            <ItemVisibilityControls
              slug={slug}
              itemId={relationship.id}
              itemName={sentence}
              allowsGuard={false}
            />
          )}
        />
      </ConnectionsCard>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Connections page, a wait or a plain message
 */
export function ConnectionsPage() {
  const { t } = useAtlasTranslation();
  const { storySlug = '' } = useParams();
  const { userId, isKnown } = useSession();
  const { cast, loadFailed } = useStoryCast(storySlug);
  const { stories } = useMyStories();
  const story = stories.find((candidate) => candidate.slug === storySlug);

  if (!isKnown) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-10 pb-12">
      <title>
        {cast ? t('connections.documentTitle', { title: cast.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId !== null && (
        <AtlasTopBar slug={storySlug} writeAddress={writeAddressFor(story)} section="connections" />
      )}
      {userId === null && <p className="m-0 text-body">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {cast === null && <Notice tone="error">{t('notFound')}</Notice>}
      {cast !== undefined && cast !== null && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
              {t('connections.heading')}
            </h1>
            <p className="m-0 text-sm text-meta">
              {cast.storyTitle} · {t('privateNote')}
            </p>
          </header>
          <ConnectionsBody slug={storySlug} cast={cast} />
        </>
      )}
    </PageContainer>
  );
}
