/**
 * NewSpacePage: "Create a space", at /spaces/new (bundle FORUMS-2, part a; story S1-E8-06
 * criteria 1 to 5; design/boards/Space.dc.html's "Create a space" card).
 *
 * Who shows it: the router; "Create a space" on the forum index and on /spaces link here.
 * What it shows: signed out, a link to log in; with no known age group, why a space can't be
 * started yet; otherwise the intro for the owner's age group and the form. The new space opens
 * once it is made. An adult with the Teacher badge is first asked "What kind of space?": an open
 * space or a class space (bundle CLASSES, part b; S1-E8-11 criterion 2). Everyone else never sees
 * the question, and every space they make is an open space.
 * What it calls: useMyAgeGroup → my_space_age_group(); useCreateSpace → create_space();
 * useMyTeacherCheck → my_teacher_check(); useCreateClassSpace → create_class_space().
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useMyTeacherCheck } from '@/features/teacher-badge/hooks/useMyTeacherCheck';

import type { SpaceAgeGroup, SpaceKind, SpaceSettings } from '../api/spaces';
import { useCreateClassSpace } from '../hooks/useClassTools';
import { useCreateSpace, useMyAgeGroup } from '../hooks/useSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { SpaceForm } from './SpaceForm';
import { SpaceFormCard } from './SpaceFormCard';
import { SpaceRadioGroup } from './SpaceRadioGroup';

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
 * "What kind of space?", for a teacher only (S1-E8-11 criterion 2; board 5.3).
 *
 * @param props.value - the chosen kind
 * @param props.onChange - the new choice
 * @returns the radio group
 */
function SpaceKindChoice({
  value,
  onChange,
}: {
  value: SpaceKind;
  onChange: (kind: SpaceKind) => void;
}) {
  const { t } = useSpacesTranslation();
  return (
    <SpaceRadioGroup
      legend={t('form.kind')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'open', label: t('form.kindOpen'), note: t('form.kindOpenNote') },
        { value: 'class', label: t('form.kindClass'), note: t('form.kindClassNote') },
      ]}
    />
  );
}

/**
 * The form, for a signed-in person whose age group is known.
 *
 * @param props.ageGroup - the owner's age group
 * @param props.isTeacher - whether they hold the Teacher badge (and so may start a class)
 * @returns the card with the intro, the kind choice for a teacher, and the form
 */
function NewSpaceForm({ ageGroup, isTeacher }: { ageGroup: SpaceAgeGroup; isTeacher: boolean }) {
  const { t } = useSpacesTranslation();
  const navigate = useNavigate();
  const creating = useCreateSpace();
  const creatingClass = useCreateClassSpace();
  const [kind, setKind] = useState<SpaceKind>('open');
  const isClass = kind === 'class';
  const running = isClass ? creatingClass : creating;

  /** Starts the space (or the class), then opens it. */
  async function create(settings: SpaceSettings) {
    const slug = await running.run(settings);
    void navigate(`/spaces/${slug}`);
  }

  return (
    <SpaceFormCard
      eyebrow={t('form.eyebrow')}
      title={t('form.title')}
      intro={ageGroup === 'under_16' ? t('form.introUnder16') : t('form.intro16')}
    >
      {isTeacher && <SpaceKindChoice value={kind} onChange={setKind} />}
      <SpaceForm
        initial={newSpaceDefaults(ageGroup)}
        ageGroup={ageGroup}
        ownName={null}
        isClass={isClass}
        submitLabel={isClass ? t('form.createClass') : t('form.create')}
        onSubmit={create}
        failure={running.failure}
        isRunning={running.isRunning}
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
  const { teacherCheck } = useMyTeacherCheck();
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
  // Only an adult teacher starts a class (S1-E2-11 gives the badge to adults only).
  const isTeacher = teacherCheck?.isTeacher === true && ageGroup.data === '16_plus';
  return <NewSpaceForm ageGroup={ageGroup.data} isTeacher={isTeacher} />;
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
