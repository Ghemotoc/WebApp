/**
 * JoinClassPage: "Join a class" at /class and the class invite at /class/:code (bundle CLASSES,
 * parts a and b; story S1-E8-11 criterion 5; boards G01-ClassJoin and G02-ClassInvite, user
 * stories 8.1 and 8.2).
 *
 * Who shows it: the router. A pupil types the code the teacher wrote on the board at /class, or
 * opens the link the teacher shared at /class/<code>. The page lives under /class/ rather than
 * /spaces/ so a code can never clash with a space's address.
 * What it shows (BOOKS-8): with no code, the page title and its line, the code form
 * (ClassCodeForm), the privacy note and the line for teachers (board G01: no box around them).
 * With a code, the invite (ClassInvitePanel, board G02).
 * What it calls: ClassCodeForm, ClassInvitePanel, TeacherLine.
 */
import { Trans } from 'react-i18next';
import { useParams } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassCodeForm } from './ClassCodeForm';
import { ClassInvitePanel } from './ClassInvitePanel';
import { ClassJoinTeacherLine } from './ClassJoinTeacherLine';

/**
 * The code form's page (board G01): title, line with an example code, the form and two notes.
 *
 * @returns the page's content
 */
function ClassCodeContent() {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="page-title m-0">{t('joinClass.title')}</h1>
        {/* The example code stays on one line, so a phone never splits it at a dash. */}
        <p className="m-0 max-w-[34em] type-body text-ink-muted">
          <Trans
            t={t}
            i18nKey="joinClass.enterIntro"
            components={{ example: <span className="whitespace-nowrap" /> }}
          />
        </p>
      </header>
      <ClassCodeForm />
      <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('joinClass.privacyNote')}</p>
      <ClassJoinTeacherLine />
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the code form, or the invite for the code in the address
 */
export function JoinClassPage() {
  const { code = '' } = useParams();
  return (
    <PageContainer className="py-12">
      {code === '' ? <ClassCodeContent /> : <ClassInvitePanel key={code} code={code} />}
    </PageContainer>
  );
}
