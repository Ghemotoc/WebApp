/**
 * SpaceNewThreadPage: start a thread in a space, at /spaces/:spaceSlug/new (bundle FORUMS-2,
 * part a; S1-E8-06; the forums' new-thread card in the space).
 *
 * Who shows it: the router; "New thread" on a space's page links here.
 * What it shows: the space and "New thread", then the forums'
 * NewThreadForm on the space's own forum; signed out, a link to log in; someone who can't post
 * in the space, the way back to join it. The database checks again (refuse_space_writer()).
 * Simplified design (bundle CALM-9b; board simplified F09): the space's name in a meta line above
 * "New thread", the form on the page and the space's rules beside it, 2.2 to 1 from 1024 px; on
 * phones and tablets the focus bar's back arrow stands in for the breadcrumb.
 * What it calls: useSpace → space_page(); NewThreadForm → start_forum_thread(); SpaceRulesCard.
 */
import { Link, useParams } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { NewThreadForm } from '@/features/forums/components/NewThreadForm';

import type { Space } from '../api/spaces';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceNotFound } from './SpaceNotFound';
import { SpaceRulesCard } from './SpaceRulesCard';

/**
 * What goes in the card: the form, or why there is none.
 *
 * @param props.space - the space
 * @returns the form, the log-in link or the "can't post" note
 */
function SpaceNewThreadBody({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { userId, isKnown } = useSession();
  if (!isKnown) return null;
  if (userId === null)
    return (
      <Link to="/sign-in" className="inline-flex min-h-6 items-center text-link underline">
        {t('join.logIn')}
      </Link>
    );
  if (!space.viewer.canPost)
    return (
      <Notice tone="info">
        <Link to={`/spaces/${space.slug}`} className="text-link underline">
          {t('newThread.cannotPost')}
        </Link>
      </Notice>
    );
  return <NewThreadForm forumSlug={space.forumSlug} cancelTo={`/spaces/${space.slug}`} />;
}

/**
 * Renders the page.
 *
 * @returns the heading, the form and the rules, or a "not here" note
 */
export function SpaceNewThreadPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const read = useSpace(spaceSlug);
  const space = read.data;
  return (
    <PageContainer className="flex flex-col gap-6 py-8">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {space === null && <SpaceNotFound />}
      {space !== undefined && space !== null && (
        <>
          <header className="flex max-w-[860px] flex-col gap-2">
            <MetaLine facts={[{ text: space.name }]} />
            <h1 className="page-title">{t('newThread.heading')}</h1>
          </header>
          {/* The form on the page, the space's rules beside it from 1024 px (board F09). */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
            <section aria-label={t('newThread.eyebrow')} className="flex min-w-0 flex-col gap-6">
              <SpaceNewThreadBody space={space} />
            </section>
            <SpaceRulesCard space={space} />
          </div>
        </>
      )}
    </PageContainer>
  );
}
