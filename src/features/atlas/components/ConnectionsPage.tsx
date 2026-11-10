/**
 * ConnectionsPage: /plan/s/:storySlug/connections, how a story's characters are connected in
 * Story Atlas (stories S1-E17-14 to S1-E17-16).
 *
 * The Story Atlas top bar, then a switch between three views (bundle G10 ATLAS, part b2, board
 * AtlasConnections): the relationship map (drag, zoom, Focus on, Arrange for me), the family tree
 * (with "Add to this tree", GAPS-3) and the List, which is also the map's version for screen readers (S1-E17-15). "Add a
 * connection" opens the form above the views, and a card dropped on another opens it with both
 * characters picked. With fewer than two characters the page points to the Characters page
 * instead. Only the writer sees any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryCast → story_cast(), useRelationshipChangers → the relationship functions, and
 * useMyStories for the top bar.
 */
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { NewRelationship, StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useStoryCast } from '../hooks/useStoryCast';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AddRelationshipForm } from './AddRelationshipForm';
import { AtlasTopBar } from './AtlasTopBar';
import { ConnectionsMapView } from './ConnectionsMapView';
import { FamilyTreeView } from './FamilyTreeView';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { RelationshipList } from './RelationshipList';

/** The three views the page switches between (?view= in the address, so a link keeps it). */
const connectionViews = ['map', 'tree', 'list'] as const;
type ConnectionsView = (typeof connectionViews)[number];

/** The view in the address, or the map when there is none (or an unknown one). */
function useConnectionsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('view');
  const view = connectionViews.find((candidate) => candidate === asked) ?? 'map';
  /** Switches view and keeps it in the address, without a new history entry each time. */
  const setView = (next: ConnectionsView) =>
    setSearchParams(next === 'map' ? {} : { view: next }, { replace: true });
  return { view, setView };
}

/** The open "Add a connection" panel: closed, or open with any characters already picked. */
interface AddPanel {
  isOpen: boolean;
  pair?: { fromId: string; toId: string };
  /** Changes each time the panel opens, so the form starts afresh with the new pair. */
  opening: number;
}

/** The "Add a connection" form, in its own card above the views. */
function AddConnectionPanel({
  cast,
  panel,
  onAdd,
}: {
  cast: StoryCast;
  panel: AddPanel;
  onAdd: (relationship: NewRelationship) => Promise<void>;
}) {
  const { t } = useAtlasTranslation();
  return (
    <section
      id="atlas-add-connection"
      aria-labelledby="atlas-add-relationship-heading"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-add-relationship-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('connections.add.heading')}
      </h2>
      <AddRelationshipForm
        key={panel.opening}
        idPrefix="atlas-relationship"
        cast={cast}
        initialPair={panel.pair}
        onAdd={onAdd}
      />
    </section>
  );
}

/** The view switch, Add a connection and, when open, its form. */
function ConnectionsHeader({
  cast,
  view,
  onView,
  panel,
  onPanel,
  onAdd,
}: {
  cast: StoryCast;
  view: ConnectionsView;
  onView: (view: ConnectionsView) => void;
  panel: AddPanel;
  onPanel: (panel: AddPanel) => void;
  onAdd: (relationship: NewRelationship) => Promise<void>;
}) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SegmentedControl
          legend={t('connections.views.legend')}
          isLegendVisible={false}
          name="atlas-connections-view"
          options={connectionViews.map((value) => ({
            value,
            label: t(`connections.views.${value}`),
          }))}
          value={view}
          onChange={onView}
        />
        <Button
          type="button"
          variant="secondary"
          aria-expanded={panel.isOpen}
          aria-controls="atlas-add-connection"
          onClick={() => onPanel({ isOpen: !panel.isOpen, opening: panel.opening + 1 })}
        >
          {t('connections.add.open')}
        </Button>
      </div>
      {panel.isOpen && <AddConnectionPanel cast={cast} panel={panel} onAdd={onAdd} />}
    </div>
  );
}

/** The name each view's card is read out by, the same as the old cards' headings. */
const viewHeadings = {
  map: 'connections.map.heading',
  tree: 'connections.tree.heading',
  list: 'connections.list.heading',
} as const;

/** The card holding the picked view: the map, the family tree or the list. */
function ConnectionsViewCard({
  slug,
  cast,
  view,
  addressOf,
  onConnect,
}: {
  slug: string;
  cast: StoryCast;
  view: ConnectionsView;
  addressOf: (characterId: string) => string;
  onConnect: (fromId: string, toId: string) => void;
}) {
  const { t } = useAtlasTranslation();
  const { relate, unrelate } = useRelationshipChangers(slug);
  const words = useRelationshipWords(cast);
  return (
    <section
      aria-label={t(viewHeadings[view])}
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-4 py-5 shadow-card sm:px-7 sm:py-[26px]"
    >
      {view === 'map' && (
        <ConnectionsMapView
          slug={slug}
          cast={cast}
          words={words}
          addressOf={addressOf}
          onConnect={onConnect}
        />
      )}
      {view === 'tree' && (
        <FamilyTreeView addressOf={addressOf} cast={cast} words={words} onAdd={relate} />
      )}
      {view === 'list' && (
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
      )}
    </section>
  );
}

/** The views, or the pointer to the Characters page. */
function ConnectionsBody({ slug, cast }: { slug: string; cast: StoryCast }) {
  const { t } = useAtlasTranslation();
  const { relate } = useRelationshipChangers(slug);
  const { view, setView } = useConnectionsView();
  const [panel, setPanel] = useState<AddPanel>({ isOpen: false, opening: 0 });
  // Each card and box opens that character's sheet.
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
  /** A card dropped on another: the form opens with both picked and scrolls into view. */
  const onConnect = (fromId: string, toId: string) => {
    setPanel({ isOpen: true, pair: { fromId, toId }, opening: panel.opening + 1 });
    requestAnimationFrame(() => document.getElementById('atlas-relationship-group')?.focus());
  };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ConnectionsHeader
        cast={cast}
        view={view}
        onView={setView}
        panel={panel}
        onPanel={setPanel}
        onAdd={relate}
      />
      <ConnectionsViewCard
        slug={slug}
        cast={cast}
        view={view}
        addressOf={sheetAddress}
        onConnect={onConnect}
      />
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
          <AtlasPageHeading title={t('connections.heading')} />
          <ConnectionsBody slug={storySlug} cast={cast} />
        </>
      )}
    </PageContainer>
  );
}
