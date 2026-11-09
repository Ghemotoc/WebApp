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
 * IDEAS-3c (idea IDEA-20261102-4): while sign-up is by invitation (invite_only), a signed-out
 * student also gets "Create an account with this code", which opens sign-up at /join/<code>; the
 * class code stands in for the invitation and the new account joins the class when it is made.
 * G8e (liquid glass, boards ClassJoin and ClassInvite): both sit in ClassJoinCard. Once a code is
 * known to work, the card's title is the class's name and "Not now" sits beside "Join the class".
 * The board's class logo, school and teacher line are left out: class_invite_preview() shows only
 * the class's name before joining, on purpose (S1-E8-11).
 * What it calls: useClassInvitePreview → class_invite_preview(); useJoinClass →
 * join_class_space(); ClassCodeForm; ClassJoinCard.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { useClassInvitePreview, useJoinClass } from '../hooks/useClassSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassCodeForm } from './ClassCodeForm';
import { ClassJoinCard } from './ClassJoinCard';

/** The row the page's buttons sit in: side by side, wrapping on a narrow phone. */
const buttonRowClasses = 'flex flex-wrap items-center gap-3';

/**
 * "Log in to join" for a signed-out visitor, and the way to make an account. While sign-up is by
 * invitation, the class code is the invitation (IDEAS-3c), so the second link opens sign-up with
 * it; when anyone may sign up, the note says to make an account and open the link again.
 *
 * @param props.code - the code from the link
 * @returns the two ways in
 */
function SignedOutJoin({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  const flags = useFeatureFlags();
  // Step 1: the safe default is "by invitation", as on the sign-up page.
  const isInviteOnly = flags.isOn('invite_only', true);
  return (
    <>
      <div className={buttonRowClasses}>
        <Link to="/sign-in" className={buttonClassName({ size: 'lg' })}>
          {t('joinClass.logIn')}
        </Link>
        {isInviteOnly && (
          <Link
            to={`/join/${encodeURIComponent(code)}`}
            className={buttonClassName({ variant: 'secondary', size: 'lg' })}
          >
            {t('joinClass.signUpWithCode')}
          </Link>
        )}
      </div>
      <p className="m-0 text-sm text-body">
        {isInviteOnly ? t('joinClass.signUpWithCodeNote') : t('joinClass.signUpOpen')}
      </p>
    </>
  );
}

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

  if (userId === null) return <SignedOutJoin code={code} />;
  return (
    <>
      <div className={buttonRowClasses}>
        <Button type="button" size="lg" disabled={joining.isRunning} onClick={join}>
          {t('joinClass.join')}
        </Button>
        <Link to="/" className={buttonClassName({ variant: 'secondary', size: 'lg' })}>
          {t('joinClass.notNow')}
        </Link>
      </div>
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
      <p className="m-0 text-base leading-relaxed text-body">{t('joinClass.invitedBody')}</p>
      <JoinAction code={code} joining={joining} />
    </>
  );
}

/**
 * The card for a code: titled with the class's name once the code is known to work, with the
 * preview's body, or "you're in" once a student who can't read yet has joined.
 *
 * @param props.code - the code from the link
 * @returns the card
 */
function InviteCard({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  const preview = useClassInvitePreview(code);
  const joining = useJoinClass();
  // The class's name is remembered once the code is shown valid: joining may use the code's last
  // place, and the preview then says it ended, but the card still names the class.
  const [className, setClassName] = useState<string | null>(null);
  const validName = preview.data?.status === 'valid' ? preview.data.space.name : null;
  if (validName !== null && validName !== className) setClassName(validName);

  const hasJoinedWaiting = joining.joined !== null && !joining.joined.canRead;
  return (
    <ClassJoinCard eyebrow={t('joinClass.eyebrow')} title={className ?? t('joinClass.title')}>
      {hasJoinedWaiting ? (
        <Notice tone="success">{t('joinClass.joinedWaiting', { name: className ?? '' })}</Notice>
      ) : (
        <PreviewBody code={code} preview={preview} joining={joining} />
      )}
    </ClassJoinCard>
  );
}

/**
 * Renders the page.
 *
 * @returns the card with what the code opens, or the card with the form to type a code
 */
export function JoinClassPage() {
  const { t } = useSpacesTranslation();
  const { code = '' } = useParams();
  return (
    <PageContainer className="flex flex-col py-10 md:py-14">
      {code === '' ? (
        <ClassJoinCard eyebrow={t('joinClass.formEyebrow')} title={t('joinClass.title')}>
          <ClassCodeForm />
        </ClassJoinCard>
      ) : (
        <InviteCard key={code} code={code} />
      )}
    </PageContainer>
  );
}
