/**
 * AuthCard: the centred card the log-in and password screens share (story S1-E2-05; board 2.2).
 *
 * Board values: one white card, 28 px radius, a soft shadow, at most 480 px wide, with an
 * eyebrow, the page's one heading (h1) and a short line under it. A page may add one board
 * doodle in the empty space to the right on wide screens (the log-in teacup, LOOK-6).
 * Who uses it: SignInPage, ForgotPasswordPage, ResetPasswordPage and NotOpenPage.
 */
import type { ReactNode } from 'react';

import { Doodle } from '@/components/ui/Doodle';
import type { DoodleName } from '@/components/ui/doodleSources';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

/** What the card shows. */
interface AuthCardProps {
  /** The browser tab's title. */
  documentTitle: string;
  eyebrow: string;
  heading: string;
  /** The line under the heading, if any. */
  intro?: string;
  /** A board doodle beside the card on wide screens (the log-in page's teacup, LOOK-6). */
  doodle?: DoodleName;
  children: ReactNode;
}

/**
 * Renders the page with the card.
 *
 * @returns the page
 */
export function AuthCard({
  documentTitle,
  eyebrow,
  heading,
  intro,
  doodle,
  children,
}: AuthCardProps) {
  return (
    <PageContainer className="tmc-rise relative flex justify-center pt-12 pb-7">
      <title>{documentTitle}</title>
      {/* The page's doodle sits in the empty space to the card's right, from 1000 px only. */}
      {doodle !== undefined && (
        <Doodle
          name={doodle}
          kind="background"
          hideBelow="wide"
          className="absolute top-14 right-[clamp(16px,4vw,64px)] w-[150px] -rotate-6"
        />
      )}
      <section
        aria-labelledby="auth-card-heading"
        className="flex w-full max-w-[480px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1
            id="auth-card-heading"
            className="m-0 font-heading text-[30px] font-bold text-heading"
          >
            {heading}
          </h1>
          {intro !== undefined && <p className="m-0 text-body">{intro}</p>}
        </div>
        {children}
      </section>
    </PageContainer>
  );
}
