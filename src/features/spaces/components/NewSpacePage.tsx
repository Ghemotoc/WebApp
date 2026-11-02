/**
 * NewSpacePage: "Create a space", at /spaces/new (bundle FORUMS-2, part a; story S1-E8-06
 * criteria 1 to 5; design/boards/Space.dc.html's "Create a space" card).
 *
 * Who shows it: the router; "Create a space" on the forum index and on /spaces link here.
 * What it shows: signed out, a link to log in; with no known age group, why a space can't be
 * started yet; otherwise the intro for the owner's age group and the form. The new space opens
 * once it is made. The board's "What kind of space?" choice (open or class space) comes with
 * class spaces (bundle CLASSES); noted in docs/board-fixes.md.
 * What it calls: useMyAgeGroup → my_space_age_group(); useCreateSpace → create_space().
 */
import { Link, useNavigate } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import type { SpaceAgeGroup, SpaceSettings } from '../api/spaces';
import { useCreateSpace, useMyAgeGroup } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceForm } from './SpaceForm';
import { SpaceFormCard } from './SpaceFormCard';

/**
 * A new space's starting settings. Under-16 spaces start readable by members only (a proposal:
 * the most private choice first); 16+ spaces are read by everybody.
 *
 * @param ageGroup - the owner's age group
 * @returns the defaults
 */
function newSpaceDefaults(ageGroup: SpaceAgeGroup): SpaceSettings {
  return {
    name: '',
    description: '',
    rules: '',
    posting: 'members',
    joining: 'approve',
    readers: ageGroup === 'under_16' ? 'members' : 'everybody',
    banner: 'plum',
  };
}

/**
 * The form, for a signed-in person whose age group is known.
 *
 * @param props.ageGroup - the owner's age group
 * @returns the card with the intro and the form
 */
function NewSpaceForm({ ageGroup }: { ageGroup: SpaceAgeGroup }) {
  const { t } = useSpacesTranslation();
  const navigate = useNavigate();
  const creating = useCreateSpace();

  /** Starts the space, then opens it. */
  async function create(settings: SpaceSettings) {
    const slug = await creating.run(settings);
    void navigate(`/spaces/${slug}`);
  }

  return (
    <SpaceFormCard
      eyebrow={t('form.eyebrow')}
      title={t('form.title')}
      intro={ageGroup === 'under_16' ? t('form.introUnder16') : t('form.intro16')}
    >
      <SpaceForm
        initial={newSpaceDefaults(ageGroup)}
        ageGroup={ageGroup}
        ownName={null}
        submitLabel={t('form.create')}
        onSubmit={create}
        failure={creating.failure}
        isRunning={creating.isRunning}
        cancelTo="/spaces"
      />
    </SpaceFormCard>
  );
}

/**
 * What goes on the page: the log-in link, the age note or the form.
 *
 * @returns the page's body
 */
function NewSpaceBody() {
  const { t } = useSpacesTranslation();
  const { userId, isKnown } = useSession();
  const ageGroup = useMyAgeGroup();
  if (!isKnown) return null;
  if (userId === null)
    return (
      <p className="m-0 text-base text-body">
        <Link to="/sign-in" className="text-link underline">
          {t('form.logIn')}
        </Link>
      </p>
    );
  if (ageGroup.isError) return <Notice tone="error">{t('failures.unreachable')}</Notice>;
  if (ageGroup.data === undefined) return null;
  if (ageGroup.data === null)
    return (
      <SpaceFormCard eyebrow={t('form.eyebrow')} title={t('form.title')}>
        <Notice tone="info">{t('form.introUnknown')}</Notice>
      </SpaceFormCard>
    );
  return <NewSpaceForm ageGroup={ageGroup.data} />;
}

/**
 * Renders the page.
 *
 * @returns the breadcrumb and the card
 */
export function NewSpacePage() {
  const { t } = useSpacesTranslation();
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      <SpaceBreadcrumb current={t('form.title')} />
      <NewSpaceBody />
    </PageContainer>
  );
}
