/**
 * ConnectionsPage: /plan/s/:storySlug/connections, the Relationships page: how a story's
 * characters are connected in Story Atlas (stories S1-E17-14 to S1-E17-16; called "Connections"
 * until bundle CALM-9a renamed it, Robert, 22 Nov 2026).
 *
 * The Story Atlas top bar, the heading, then Map and Family tree, two views of the same
 * relationships (user stories bundle 6, story 6.6, board E25). The Map view holds the map, the
 * list of relationships in words and the "Add a relationship" form at its foot
 * (ConnectionsMapView); the family tree has its own "Add a relationship" (story 6.7, board E26). The old List view
 * (?view=list) opens the map, whose list is under it. "Add a relationship" in the top bar comes
 * here with ?add=1, which brings the form into view and puts the focus on its first picker. With
 * fewer than two characters the page points to the Characters page instead. Only the writer sees
 * any of it.
 * Who calls it: src/app/router.tsx (loaded only when a writer opens it). What it calls:
 * useStoryCast → story_cast(), useRelationshipChangers → the relationship functions, and
 * useMyStories for the top bar.
 */
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import type { StoryCast } from '../api/characters';
import { useRelationshipChangers } from '../hooks/useRelationshipChangers';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useStoryCast } from '../hooks/useStoryCast';
import { writeAddressFor } from '../lib/writeAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasPageHeading } from './AtlasPageHeading';
import { AtlasFrame } from './AtlasFrame';
import { ConnectionsMapView } from './ConnectionsMapView';
import { FamilyTreeView } from './FamilyTreeView';

/** The two views the page switches between (?view= in the address, so a link keeps it). */
const connectionViews = ['map', 'tree'] as const;
type ConnectionsView = (typeof connectionViews)[number];

/** The view in the address, or the map when there is none (or an unknown one, such as "list"). */
function useConnectionsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('view');
  const view = connectionViews.find((candidate) => candidate === asked) ?? 'map';
  /** Switches view and keeps it in the address, without a new history entry each time. */
  const setView = (next: ConnectionsView) =>
    setSearchParams(next === 'map' ? {} : { view: next }, { replace: true });
  return { view, setView };
}

/**
 * ?add=1 (the top bar's "Add a relationship"): shows the map, brings the form into view and puts
 * the focus on its first picker, then takes ?add=1 out of the address so a second press works too.
 */
function useAddFromTopBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAsked = searchParams.get('add') === '1';
  useEffect(() => {
    if (!isAsked) return;
    setSearchParams({}, { replace: true });
    requestAnimationFrame(() => {
      document.getElementById('atlas-add-relationship')?.scrollIntoView({ block: 'start' });
      document.getElementById('atlas-relationship-from')?.focus({ preventScroll: true });
    });
  }, [isAsked, setSearchParams]);
}

/** Map and Family tree, the switch between the two views of the same relationships. */
function ViewSwitch({
  view,
  onView,
}: {
  view: ConnectionsView;
  onView: (view: ConnectionsView) => void;
}) {
  const { t } = useAtlasTranslation();
  return (
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
  );
}

/** The views, or the pointer to the Characters page. */
function ConnectionsBody({ slug, cast }: { slug: string; cast: StoryCast }) {
  const { t } = useAtlasTranslation();
  const { relate } = useRelationshipChangers(slug);
  const words = useRelationshipWords(cast);
  const { view, setView } = useConnectionsView();
  useAddFromTopBar();
  // Each card and box opens that character's sheet.
  const sheetAddress = (characterId: string) => `/plan/s/${slug}/characters/${characterId}`;
  if (cast.characters.length < 2) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-ink-muted">{t('connections.noCharacters')}</p>
        <Link to={`/plan/s/${slug}/characters`} className="self-start font-semibold text-link">
          {t('connections.openCharacters')}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ViewSwitch view={view} onView={setView} />
      {view === 'map' && (
        <ConnectionsMapView slug={slug} cast={cast} words={words} addressOf={sheetAddress} />
      )}
      {/* The tree sits straight on the page, as board E26 draws it. */}
      {view === 'tree' && (
        <FamilyTreeView addressOf={sheetAddress} cast={cast} words={words} onAdd={relate} />
      )}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Relationships page, a wait or a plain message
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
    <AtlasFrame
      slug={storySlug}
      writeAddress={writeAddressFor(story)}
      section="connections"
      showsChrome={userId !== null}
    >
      <title>
        {cast ? t('connections.documentTitle', { title: cast.storyTitle }) : t('homeDocumentTitle')}
      </title>
      {userId === null && <p className="m-0 text-ink-muted">{t('signedOut')}</p>}
      {loadFailed && <Notice tone="error">{t('loadFailed')}</Notice>}
      {cast === null && <Notice tone="error">{t('notFound')}</Notice>}
      {cast !== undefined && cast !== null && (
        <>
          <AtlasPageHeading title={t('connections.heading')} />
          <ConnectionsBody slug={storySlug} cast={cast} />
        </>
      )}
    </AtlasFrame>
  );
}
