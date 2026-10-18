/**
 * MaintenancePage: "We're updating …", shown to everyone but staff while maintenance mode is on
 * (story S1-E1-05; board 7.4, States, card 3).
 *
 * Who shows it: components/MaintenanceGate.tsx, in place of the page someone opened.
 * What it calls: nothing itself; "Check again" is the gate's checkAgain, and "Staff sign-in" opens
 * the normal log-in page, which stays open during maintenance (lib/openDuringMaintenance.ts).
 * Board differences: no "back by 14:00" time (there is no setting for it yet; follow-up) and no
 * desk-lamp doodle or icon yet (no screen uses doodles yet; follow-up).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';

/** What the page needs from the gate. */
interface MaintenancePageProps {
  /** Reads the maintenance flag again. */
  onCheckAgain: () => void;
  /** True while that read is running, so the button says so. */
  isChecking: boolean;
}

/**
 * Renders the maintenance card.
 *
 * @returns the card with "Check again" and the staff sign-in link
 */
export function MaintenancePage({ onCheckAgain, isChecking }: MaintenancePageProps) {
  const { t } = useTranslation();

  return (
    <PageContainer className="flex justify-center pt-12 pb-7">
      <title>{t('maintenance.documentTitle', { productName: brand.productName })}</title>
      <section
        aria-labelledby="maintenance-heading"
        className="flex w-full max-w-[560px] flex-col items-start gap-3.5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
      >
        <h1 id="maintenance-heading" className="m-0 font-heading text-[28px] font-bold text-ink">
          {t('maintenance.heading', { productName: brand.productName })}
        </h1>
        <p className="m-0 text-base text-body">{t('maintenance.body')}</p>
        <Button size="lg" onClick={onCheckAgain} disabled={isChecking} aria-busy={isChecking}>
          {isChecking ? t('maintenance.checking') : t('maintenance.checkAgain')}
        </Button>
        <p className="m-0 mt-2 w-full border-t border-hairline pt-3.5 text-[15px] text-body">
          {t('maintenance.staffLine')}{' '}
          <Link
            to="/sign-in"
            className="inline-flex min-h-11 items-center font-semibold text-link hover:text-link-hover"
          >
            {t('maintenance.staffSignIn')}
          </Link>
        </p>
      </section>
    </PageContainer>
  );
}
