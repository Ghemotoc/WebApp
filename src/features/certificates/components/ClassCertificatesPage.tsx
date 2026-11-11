/**
 * ClassCertificatesPage: /spaces/:spaceSlug/certificates, a class's certificates for its teacher
 * (bundle CLASSES, part e; story S1-E8-12 criteria 1 and 5).
 *
 * What it shows: the results form for a new programme (only while the class isn't archived) and
 * every certificate signed in the class, with each student's name, the programme, the result and
 * the code. Never a student's printed real name.
 * Who shows it: the router; the class's settings link here (ClassCertificatesCard). The database
 * lets in only whoever holds the class's settings power, and only the teacher signs.
 * What it calls: useSpace() and useSpaceMembers() from spaces, useClassCertificates().
 */
import { useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import type { Space } from '@/features/spaces/api/spaces';
import { SpaceBreadcrumb } from '@/features/spaces/components/SpaceBreadcrumb';
import { useSpaceMembers } from '@/features/spaces/hooks/useSpaceModeration';
import { useSpace } from '@/features/spaces/hooks/useSpaces';

import { useClassCertificates } from '../hooks/useClassCertificates';
import { defaultCertificateLook } from '../lib/certificateLook';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

import { ClassResultsForm, type ClassStudent } from './ClassResultsForm';

/**
 * The certificates already signed in the class.
 *
 * @param props.slug - the class's address
 * @returns the section
 */
function SignedCertificates({ slug }: { slug: string }) {
  const { t } = useCertificatesTranslation();
  const read = useClassCertificates(slug);
  return (
    <section aria-labelledby="signed-certificates-heading" className="flex flex-col gap-3">
      <h2
        id="signed-certificates-heading"
        className="m-0 font-heading text-2xl font-bold text-heading"
      >
        {t('class.issuedTitle')}
      </h2>
      {read.isError && <Notice tone="error">{t('class.loadFailed')}</Notice>}
      {read.data?.length === 0 && <p className="m-0 text-body">{t('class.issuedEmpty')}</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {(read.data ?? []).map((certificate) => (
          <li
            key={certificate.code}
            className="flex flex-wrap items-center gap-3 border-b border-border py-2"
          >
            <span className="font-semibold text-ink">{certificate.studentName}</span>
            <span className="text-body">{certificate.programmeName}</span>
            <InfoPill tone={certificate.result === 'participant' ? 'sky' : 'gold'}>
              {t(`results.${certificate.result}`)}
            </InfoPill>
            {certificate.isRevoked && <InfoPill tone="blush">{t('class.revoked')}</InfoPill>}
            <span className="text-sm text-body">{certificate.code}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The class's students: every member but the teacher, with a name to show.
 *
 * @param members - the class's members
 * @returns the students the results list offers
 */
function studentsOf(
  members: NonNullable<ReturnType<typeof useSpaceMembers>['data']>,
): ClassStudent[] {
  const students: ClassStudent[] = [];
  for (const member of members) {
    if (member.role === 'owner' || member.person === null) continue;
    students.push({ handle: member.person.handle, displayName: member.person.displayName });
  }
  return students;
}

/**
 * The results form, with the class's students, or why there is none.
 *
 * @param props.space - the class
 * @returns the form or a note
 */
function NewResults({ space }: { space: Space }) {
  const { t } = useCertificatesTranslation();
  const { slug, isArchived } = space;
  const members = useSpaceMembers(slug, !isArchived);
  // G13a: the form starts from the look of the newest certificate signed in the class.
  const signed = useClassCertificates(slug);
  if (isArchived) return <Notice tone="info">{t('class.archived')}</Notice>;
  const students = studentsOf(members.data ?? []);
  if (members.isSuccess && students.length === 0) {
    return <p className="m-0 text-body">{t('class.noStudents')}</p>;
  }
  if (students.length === 0 || signed.isPending) return null;
  const startLook = signed.data?.[0]?.look ?? defaultCertificateLook;
  return (
    <ClassResultsForm slug={slug} spaceId={space.id} students={students} startLook={startLook} />
  );
}

/**
 * What goes under the heading: nothing while loading, a note for anyone but the teacher, or the
 * results form and the signed list.
 *
 * @param props.slug - the class's address
 * @param props.space - the class, or null or undefined while unknown
 * @returns the body
 */
function ClassCertificatesBody({ slug, space }: { slug: string; space: Space | null | undefined }) {
  const { t } = useCertificatesTranslation();
  if (space === undefined || space === null) return null;
  if (space.viewer.membership !== 'owner') {
    return <p className="m-0 text-body">{t('class.failures.teacher_only')}</p>;
  }
  return (
    <>
      <NewResults space={space} />
      <SignedCertificates slug={slug} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function ClassCertificatesPage() {
  const { t } = useCertificatesTranslation();
  const { spaceSlug = '' } = useParams();
  const space = useSpace(spaceSlug);
  const name = space.data?.name ?? '';
  return (
    <PageContainer className="flex max-w-[860px] flex-col gap-6 py-10">
      <title>{t('class.documentTitle', { name })}</title>
      <SpaceBreadcrumb space={{ slug: spaceSlug, name }} current={t('class.title')} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{name}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold text-heading">
          {t('class.title')}
        </h1>
      </header>
      <ClassCertificatesBody slug={spaceSlug} space={space.data} />
    </PageContainer>
  );
}
