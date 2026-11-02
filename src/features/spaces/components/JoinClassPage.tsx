/**
 * JoinClassPage: "Join a class", at /class/:code, where a class invite link opens (bundle
 * CLASSES, part a; story S1-E8-11 criterion 5).
 *
 * Who shows it: the router, when a student opens the link the teacher printed or shared, or types
 * the code. The page lives under /class/ rather than /spaces/ so a code can never clash with a
 * space's address.
 * What it shows: which class the code is for (only when the code works, and only the class's
 * name, class_invite_preview()), "Join the class", or "Log in to join" for a signed-out visitor;
 * a plain note when the code has ended or is unknown. After joining, the student goes straight to
 * the class; a student whose account isn't ready yet (a parent still to agree) is told they are
 * in and will read once it is.
 * With no code in the address (/class, bundle CLASSES, part b) it shows ClassCodeForm, where the
 * student types the code the teacher wrote on the board.
 * What it calls: useClassInvitePreview → class_invite_preview(); useJoinClass →
 * join_class_space(); ClassCodeForm.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useClassInvitePreview, useJoinClass } from '../hooks/useClassSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassCodeForm } from './ClassCodeForm';
import { SpaceFormCard } from './SpaceFormCard';

/** The look of the page's main link-buttons, shared so both match. */
const linkButtonClasses =
  'inline-flex h-12 items-center self-start rounded-full bg-primary px-5 text-[15px] font-semibold text-on-primary no-underline hover:opacity-90';

/** Joining, as useJoinClass() gives it. */
type Joining = ReturnType<typeof useJoinClass>;

/**
 * "Join the class" for a signed-in student, or "Log in to join".
 *
 * @param props.code - the code from the link
 * @param props.joining - the join call, held by the page so its answer outlives the preview
 * @returns the button (or link) and any refusal
 */
function JoinAction({ code, joining }: { code: string; joining: Joining }) {
  const { t } = useSpacesTranslation();
  const { userId } = useSession();
  const navigate = useNavigate();

  /** Joins, then opens the class when the student can already read it. */
  async function join() {
    const joined = await joining.join(code).catch(() => null);
    if (joined?.canRead === true) void navigate(`/spaces/${joined.slug}`);
  }

  if (userId === null) {
    return (
      <>
        <Link to="/sign-in" className={linkButtonClasses}>
          {t('joinClass.logIn')}
        </Link>
        <p className="m-0 text-sm text-body">{t('joinClass.signUp')}</p>
      </>
    );
  }
  return (
    <>
      <Button type="button" className="self-start" disabled={joining.isRunning} onClick={join}>
        {t('joinClass.join')}
      </Button>
      <div aria-live="polite">
        {joining.failure !== null && (
          <Notice tone="error">{t(`classInvite.failures.${joining.failure.failure}`)}</Notice>
        )}
      </div>
    </>
  );
}

/**
 * What the card says for the code: checking, who it is for, ended, unknown or a load error.
 *
 * @param props.code - the code from the link
 * @param props.preview - class_invite_preview()'s answer, as useClassInvitePreview() gives it
 * @param props.joining - the join call
 * @returns the card's body
 */
function PreviewBody({
  code,
  preview,
  joining,
}: {
  code: string;
  preview: ReturnType<typeof useClassInvitePreview>;
  joining: Joining;
}) {
  const { t } = useSpacesTranslation();
  if (preview.isError) return <Notice tone="error">{t('joinClass.loadFailed')}</Notice>;
  if (preview.data === undefined) return <p className="m-0 text-body">{t('joinClass.checking')}</p>;
  if (preview.data.status === 'ended') return <Notice tone="info">{t('joinClass.ended')}</Notice>;
  if (preview.data.status === 'unknown') {
    return <Notice tone="info">{t('joinClass.unknown')}</Notice>;
  }
  return (
    <>
      <p className="m-0 text-lg text-heading">
        {t('joinClass.invited', { name: preview.data.space.name })}
      </p>
      <JoinAction code={code} joining={joining} />
    </>
  );
}

/**
 * The card's body, or "you're in" once a student who can't read yet has joined.
 *
 * @param props.code - the code from the link
 * @returns the body
 */
function InviteBody({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  const preview = useClassInvitePreview(code);
  const joining = useJoinClass();
  // The class's name is remembered once the code is shown valid: joining may use the code's last
  // place, and the preview then says it ended, but the "you're in" note still names the class.
  const [className, setClassName] = useState<string | null>(null);
  const validName = preview.data?.status === 'valid' ? preview.data.space.name : null;
  if (validName !== null && validName !== className) setClassName(validName);

  if (joining.joined !== null && !joining.joined.canRead) {
    return (
      <Notice tone="success">{t('joinClass.joinedWaiting', { name: className ?? '' })}</Notice>
    );
  }
  return <PreviewBody code={code} preview={preview} joining={joining} />;
}

/**
 * Renders the page.
 *
 * @returns the card with what the code opens, or the form to type a code
 */
export function JoinClassPage() {
  const { t } = useSpacesTranslation();
  const { code = '' } = useParams();
  return (
    <PageContainer className="flex flex-col gap-6 py-10">
      <SpaceFormCard eyebrow={t('joinClass.eyebrow')} title={t('joinClass.title')}>
        <div className="flex flex-col gap-4">
          {code === '' ? <ClassCodeForm /> : <InviteBody key={code} code={code} />}
        </div>
      </SpaceFormCard>
    </PageContainer>
  );
}
