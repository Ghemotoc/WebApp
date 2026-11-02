/**
 * ClassSpacesPage: /staff/schools/classes, the manual pilot mode for class spaces (bundle
 * CLASSES, part d; story S1-E8-11 criterion 10: "staff can approve the teacher from the Teacher
 * checks queue, create the space, name the teacher as owner and print the invite code"; board
 * AdminSchools 8.9).
 *
 * What it shows: the Schools tabs, "Set up a class" and every class space, newest first, each
 * with its school, teacher, members, status, its code and archiving.
 * Who shows it: the router, inside StaffLayout. The database lets in only staff with Schools
 * access (owner and admin, and moderators with the teacher checks permission), and the page says
 * so to anyone else. What it calls: useStaffClassSpaces → admin_class_spaces().
 * Plain components, no doodles.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { staffClassFailureOf, useStaffClassSpaces } from '../../hooks/useStaffClassSpaces';

import { NewClassSpaceForm } from './NewClassSpaceForm';
import { SchoolsTabs } from './SchoolsTabs';
import { StaffClassCard } from './StaffClassCard';

/**
 * What goes under the tabs: a refusal, an error, or the form and the classes.
 *
 * @returns the page's body
 */
function ClassSpacesBody() {
  const { t } = useTranslation('staff');
  const read = useStaffClassSpaces();
  const failure = staffClassFailureOf(read.error);
  if (failure?.failure === 'not_allowed') {
    return <p className="m-0 text-body">{t('classSpaces.notAllowed')}</p>;
  }
  if (failure !== null)
    return <Notice tone="error">{t('classSpaces.failures.unreachable')}</Notice>;
  if (read.data === undefined) return null;
  return (
    <>
      <NewClassSpaceForm />
      <section aria-labelledby="class-list-heading" className="flex flex-col gap-4">
        <h2 id="class-list-heading" className="m-0 font-heading text-2xl font-bold text-heading">
          {t('classSpaces.listTitle')}
        </h2>
        {read.data.length === 0 ? (
          <p className="m-0 text-body">{t('classSpaces.none')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {read.data.map((space) => (
              <StaffClassCard key={space.slug} space={space} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Class spaces screen
 */
export function ClassSpacesPage() {
  const { t } = useTranslation('staff');
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('classSpaces.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('classSpaces.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('classSpaces.heading')}
        </h1>
        <p className="m-0 text-body">{t('classSpaces.intro')}</p>
      </div>
      <SchoolsTabs />
      <div className="flex max-w-[860px] flex-col gap-6">
        <ClassSpacesBody />
      </div>
    </PageContainer>
  );
}
