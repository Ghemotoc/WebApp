/**
 * SpaceNewThreadPage: start a thread in a space, at /spaces/:spaceSlug/new (bundle FORUMS-2,
 * part a; S1-E8-06; the forums' new-thread card in the space).
 *
 * Who shows it: the router; "New thread" on a space's page links here.
 * What it shows: the breadcrumb (Forums › Spaces › the space › New thread), then the forums'
 * NewThreadForm on the space's own forum; signed out, a link to log in; someone who can't post
 * in the space, the way back to join it. The database checks again (refuse_space_writer()).
 * What it calls: useSpace → space_page(); NewThreadForm → start_forum_thread().
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { NewThreadForm } from '@/features/forums/components/NewThreadForm';

import type { Space } from '../api/spaces';
import { useSpace } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceNotFound } from './SpaceNotFound';

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
 * @returns the breadcrumb and the card, or a "not here" note
 */
export function SpaceNewThreadPage() {
  const { t } = useSpacesTranslation();
  const { spaceSlug = '' } = useParams();
  const read = useSpace(spaceSlug);
  const space = read.data;
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      {read.isError && <Notice tone="error">{t('space.loadFailed')}</Notice>}
      {space === null && <SpaceNotFound />}
      {space !== undefined && space !== null && (
        <>
          <SpaceBreadcrumb space={space} current={t('newThread.eyebrow')} />
          <section className="flex max-w-[760px] flex-col gap-5 rounded-card border border-border bg-surface p-5 md:p-7">
            <div className="flex flex-col gap-1">
              <Eyebrow>{t('newThread.eyebrow')}</Eyebrow>
              <h1 className="m-0 font-heading text-[28px] leading-tight font-extrabold text-heading">
                {t('newThread.heading', { space: space.name })}
              </h1>
            </div>
            <SpaceNewThreadBody space={space} />
          </section>
        </>
      )}
    </PageContainer>
  );
}
