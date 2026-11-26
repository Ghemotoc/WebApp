/**
 * NoticeSideColumn: the right-hand column of /report, in board J11's order (user stories, bundle
 * 10): "Is someone in danger right now?" (the safety contacts by country, one line each), what
 * happens next, "Have an account?" for visitors and "Contact details" (story S1-E10-02).
 *
 * The danger block reuses SafetyContactsBlock (S1-E10-13a) in its compact look, so the numbers
 * are the same seeded list the rest of the app shows. Every block sits straight on the page under
 * its heading, with no box, as drawn. No doodles (DoD: reporting screens).
 * Who shows it: NoticePage. What it calls: SafetyContactsBlock and useSession.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useSession } from '@/features/auth/hooks/useSession';
import { SafetyContactsBlock } from '@/features/safety/components/SafetyContactsBlock';

/** The three steps, in order. */
const nextSteps = ['receipt', 'check', 'decision'] as const;

/**
 * "What happens next", a numbered list.
 *
 * @returns the panel
 */
function WhatHappensNext() {
  const { t } = useTranslation('notices');
  return (
    <section aria-labelledby="notice-next-heading" className="flex flex-col gap-2">
      <h2
        id="notice-next-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('next.heading')}
      </h2>
      <ol className="m-0 flex list-decimal flex-col gap-2 pl-6 type-body text-ink">
        {nextSteps.map((step) => (
          <li key={step}>{t(`next.steps.${step}`)}</li>
        ))}
      </ol>
    </section>
  );
}

/**
 * "Have an account?": for a visitor only, pointing to the Report button.
 *
 * @returns the panel, or nothing for a signed-in person or while unknown
 */
function HaveAnAccount() {
  const { t } = useTranslation('notices');
  const session = useSession();
  if (!session.isKnown || session.userId !== null) return null;
  return (
    <section aria-labelledby="notice-account-heading" className="flex flex-col gap-2">
      <h2
        id="notice-account-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('account.heading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('account.body')}</p>
      {/* The board's quiet "Get in" button: a link drawn as the quiet button. */}
      <Link to="/sign-in" className={buttonClassName({ variant: 'secondary' }, 'w-fit')}>
        {t('account.logIn')}
      </Link>
    </section>
  );
}

/**
 * "Your details": what we keep and for how long, with the Privacy notice.
 *
 * @returns the panel
 */
function YourDetails() {
  const { t } = useTranslation('notices');
  return (
    <section aria-labelledby="notice-details-heading" className="flex flex-col gap-2">
      <h2
        id="notice-details-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('details.heading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('details.body')}</p>
      <Link to="/legal/privacy" className="inline-flex min-h-6 items-center text-link underline">
        {t('details.privacy')}
      </Link>
    </section>
  );
}

/**
 * Renders the column.
 *
 * @returns the four blocks, the danger one first
 */
export function NoticeSideColumn() {
  return (
    <div className="flex flex-col gap-8">
      <SafetyContactsBlock isCompact />
      <WhatHappensNext />
      <HaveAnAccount />
      <YourDetails />
    </div>
  );
}
