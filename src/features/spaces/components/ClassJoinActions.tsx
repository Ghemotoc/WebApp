/**
 * ClassJoinActions: the buttons under a class invite (story S1-E8-11 criterion 5; board
 * G02-ClassInvite, user story 8.2).
 *
 * Who shows it: ClassInvitePanel, once the code is known to work.
 * What it shows: for a signed-in pupil, "Join the class" (the main button) and "Not now" (a text
 * button back to Together); joining opens the class when the pupil can read it. For a visitor,
 * "Get in to join" and, while sign-up is by invitation, "Create an account with this code", which
 * opens sign-up at /join/<code>: the class code stands in for the invitation (IDEAS-3c).
 * What it calls: useJoinClass's join() (held by the panel, so its answer outlives the preview),
 * useSession, useFeatureFlags.
 */
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import type { useJoinClass } from '../hooks/useClassSpaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** Joining, as useJoinClass() gives it. */
type Joining = ReturnType<typeof useJoinClass>;

/** Where "Not now" goes: Together, the forums page (user story 8.2). */
const togetherAddress = '/forums';

/**
 * "Get in to join" for a signed-out visitor, and the way to make an account.
 *
 * @param props.code - the code from the link
 * @returns the two ways in and the note under them
 */
function SignedOutJoin({ code }: { code: string }) {
  const { t } = useSpacesTranslation();
  const flags = useFeatureFlags();
  // Step 1: the safe default is "by invitation", as on the sign-up page.
  const isInviteOnly = flags.isOn('invite_only', true);
  return (
    <>
      <ButtonRow>
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
      </ButtonRow>
      <p className="m-0 type-body text-ink-muted">
        {isInviteOnly ? t('joinClass.signUpWithCodeNote') : t('joinClass.signUpOpen')}
      </p>
    </>
  );
}

/**
 * Renders the buttons for the person looking.
 *
 * @param props.code - the code from the link
 * @param props.joining - the join call
 * @returns "Join the class" and "Not now", or the ways in for a visitor
 */
export function ClassJoinActions({ code, joining }: { code: string; joining: Joining }) {
  const { t } = useSpacesTranslation();
  const { userId } = useSession();
  const navigate = useNavigate();

  /** Joins, then opens the class when the pupil can already read it. */
  async function join() {
    const joined = await joining.join(code).catch(() => null);
    if (joined?.canRead === true) void navigate(`/spaces/${joined.slug}`);
  }

  if (userId === null) return <SignedOutJoin code={code} />;
  return (
    <>
      <ButtonRow>
        <Button type="button" size="lg" disabled={joining.isRunning} onClick={join}>
          {t('joinClass.join')}
        </Button>
        <Link to={togetherAddress} className={buttonClassName({ variant: 'text' })}>
          {t('joinClass.notNow')}
        </Link>
      </ButtonRow>
      <div aria-live="polite">
        {joining.failure !== null && (
          <Notice tone="error">{t(`classInvite.failures.${joining.failure.failure}`)}</Notice>
        )}
      </div>
    </>
  );
}
