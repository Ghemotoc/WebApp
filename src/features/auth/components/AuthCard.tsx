/**
 * AuthCard: the centred card the log-in and password screens share (story S1-E2-05; board 2.2).
 *
 * Board values: one box, at most 520 px wide, with the page's one heading (h1) and a short, quieter
 * line under it. The simplified design (CALM-9e, boards H05 to H07 and H16) dropped the eyebrow
 * above the heading: the heading says it on its own. The heading is the title size on phones and
 * tablets and the display size from 1024 px.
 * Who uses it: SignInPage, ForgotPasswordPage, ResetPasswordPage and NotOpenPage.
 */
import type { ReactNode } from 'react';

import { PageContainer } from '@/components/ui/PageContainer';

/** What the card shows. */
interface AuthCardProps {
  /** The browser tab's title. */
  documentTitle: string;
  heading: string;
  /** The line under the heading, if any. */
  intro?: string;
  children: ReactNode;
}

/**
 * Renders the page with the card.
 *
 * @returns the page
 */
export function AuthCard({ documentTitle, heading, intro, children }: AuthCardProps) {
  return (
    <PageContainer className="tmc-rise relative flex justify-center pt-12 pb-7">
      <title>{documentTitle}</title>
      <section
        aria-labelledby="auth-card-heading"
        className="flex w-full max-w-[520px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <div className="flex flex-col gap-2">
          <h1 id="auth-card-heading" className="m-0 type-title break-words lg:type-display">
            {heading}
          </h1>
          {intro !== undefined && <p className="m-0 text-meta">{intro}</p>}
        </div>
        {children}
      </section>
    </PageContainer>
  );
}
