/**
 * WaitlistHoldingPage: what someone waiting on the list sees after logging in (bundle WAITLIST-1,
 * story S1-E2-24; Robert, 6 Nov 2026, 17:27 UTC: "a holding page where they can pick an avatar
 * and favourite genres, but can't write, read or post yet").
 *
 * Top to bottom: "You're on the list" with the day they joined and what happens next; their
 * "write, read or both" answer, which they can change; their avatar (AvatarBuilderSection, the
 * same as Settings › Profile); the kinds of stories they like (LikesSettingsSection); and links to
 * Settings (emails, occasional news, delete the account) and to log out.
 * There is no board for it: it follows the Settings sections' cards. No doodles beside the text.
 * Who shows it: WaitlistGate. What it calls: useMyNames for the username; the sections call their
 * own hooks.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { signOutHere } from '@/features/auth/api/signIn';
import { AvatarBuilderSection } from '@/features/avatars/components/AvatarBuilderSection';
import { LikesSettingsSection } from '@/features/onboarding/components/LikesSettingsSection';
import { getSupabaseClient } from '@/lib/supabase';

import type { WaitlistInterest } from '../api/waitlist';

import { WaitlistInterestPicker } from './WaitlistInterestPicker';

/** What the page needs. */
interface WaitlistHoldingPageProps {
  interest: WaitlistInterest;
  /** When the person joined the list (ISO time). */
  joinedAt: string;
}

/**
 * "Log out", for someone else to use this device.
 *
 * @returns the button and, if logging out failed, a plain message
 */
function LogOutButton() {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const [hasFailed, setHasFailed] = useState(false);

  /** Logs this device out, then goes home. */
  async function logOut() {
    try {
      const client = await getSupabaseClient();
      if (client !== null) await signOutHere(client);
      void navigate('/');
    } catch {
      setHasFailed(true);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => void logOut()}>
        {t('waitlist.holding.logOut')}
      </Button>
      {hasFailed && <Notice tone="error">{t('waitlist.holding.logOutFailed')}</Notice>}
    </>
  );
}

/**
 * The page's opening: the heading, when they joined and what comes next.
 *
 * @param props.joinedAt - when the person joined the list
 * @returns the heading block
 */
function HoldingIntro({ joinedAt }: { joinedAt: string }) {
  const { t, i18n } = useTranslation('account');
  // The day in the reader's language and Romanian time, like every date in the app.
  const joinedDay = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'ro', {
    timeZone: 'Europe/Bucharest',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(joinedAt));
  return (
    <div className="flex max-w-[720px] flex-col gap-2">
      <Eyebrow>{t('waitlist.holding.eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
        {t('waitlist.holding.heading')}
      </h1>
      <p className="m-0 text-body">{t('waitlist.holding.joined', { date: joinedDay })}</p>
      <p className="m-0 text-body">{t('waitlist.holding.next')}</p>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the holding page
 */
export function WaitlistHoldingPage({ interest, joinedAt }: WaitlistHoldingPageProps) {
  const { t } = useTranslation('account');
  const { names } = useMyNames();
  const handle = names?.handle ?? null;
  return (
    <PageContainer className="flex flex-col gap-8 pt-12 pb-7">
      <title>{t('waitlist.holding.documentTitle')}</title>
      <HoldingIntro joinedAt={joinedAt} />
      <section
        aria-label={t('waitlist.holding.interestLabel')}
        className="flex max-w-[860px] flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
      >
        <WaitlistInterestPicker interest={interest} />
      </section>
      <div className="flex max-w-[860px] flex-col gap-6">
        {handle !== null && <AvatarBuilderSection handle={handle} />}
        <LikesSettingsSection />
      </div>
      <div className="flex max-w-[860px] flex-wrap items-center gap-4">
        <Link to="/settings" className="text-link underline">
          {t('waitlist.holding.settingsLink')}
        </Link>
        <LogOutButton />
      </div>
    </PageContainer>
  );
}
