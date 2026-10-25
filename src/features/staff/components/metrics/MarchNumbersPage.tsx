/**
 * MarchNumbersPage: /staff/metrics, the March test numbers (story S1-E15-02; board AdminMetrics,
 * screen 8.7; architecture 1.8.3: Metrics is View for owner and admin, queue numbers only for
 * moderators).
 *
 * What it shows: writers who published, signed-up readers and the return rate (labelled an
 * approximation, decided 17 Oct 2026, 12:34), each with its target; writers by market; chapter
 * reads per day. Totals counted once a night; nothing here lists people. Plain components, no
 * doodles (staff screens).
 * Who shows it: the router, inside StaffLayout. The database refuses anyone but the owner and
 * admins (admin_march_numbers()); a moderator is pointed to the moderation queue instead.
 * What it calls: useMarchNumbers → api/marchNumbers.ts.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { formatRomaniaShortDate } from '@/lib/romania-time';

import type { MarchNumbers } from '../../api/marchNumbers';
import { useMarchNumbers } from '../../hooks/useMarchNumbers';

import { MarchNumberLists } from './MarchNumberLists';
import { MarchTargetCard } from './MarchTargetCard';

/**
 * The three numbers with their targets.
 *
 * @param props.numbers - the answer
 * @returns the cards
 */
function MarchTargets({ numbers }: { numbers: MarchNumbers }) {
  const { t } = useTranslation('staff');
  return (
    <section aria-label={t('metrics.targetsLabel')} className="flex flex-col gap-3">
      <div className="grid gap-5 md:grid-cols-3">
        <MarchTargetCard
          label={t('metrics.writers')}
          value={numbers.writers}
          target={numbers.targets.writers}
          unit=""
          description={t('metrics.writersDescription')}
        />
        <MarchTargetCard
          label={t('metrics.readers')}
          value={numbers.readers}
          target={numbers.targets.readers}
          unit=""
          description={t('metrics.readersDescription')}
        />
        <MarchTargetCard
          label={t('metrics.returnRate')}
          value={numbers.returnRate}
          target={numbers.targets.returnRate}
          unit="%"
          description={t('metrics.returnRateDescription')}
          badge={<InfoPill tone="gold">{t('metrics.approximation')}</InfoPill>}
        />
      </div>
      <p className="m-0 text-[13px] text-meta">{t('metrics.targetsNote')}</p>
    </section>
  );
}

/**
 * The page's body: the refusal, the error, the wait or the numbers.
 *
 * @returns the body
 */
function MarchNumbersBody() {
  const { t, i18n } = useTranslation('staff');
  const { numbers, failure } = useMarchNumbers();
  if (failure === 'not_allowed') {
    return (
      <p className="m-0 text-body">
        {t('metrics.notAllowed')} <Link to="/staff/moderation">{t('metrics.queueLink')}</Link>
      </p>
    );
  }
  if (failure !== null) return <Notice tone="error">{t('metrics.unreachable')}</Notice>;
  if (numbers === null) return <p className="m-0 text-meta">{t('metrics.loading')}</p>;
  return (
    <>
      <p className="m-0 text-sm text-meta">
        {numbers.countedOn === null
          ? t('metrics.notCountedYet')
          : t('metrics.countedOn', {
              date: formatRomaniaShortDate(
                new Date(`${numbers.countedOn}T12:00:00Z`),
                i18n.language,
              ),
            })}
      </p>
      <MarchTargets numbers={numbers} />
      <MarchNumberLists
        writersByMarket={numbers.writersByMarket}
        readsPerDay={numbers.readsPerDay}
      />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Metrics screen
 */
export function MarchNumbersPage() {
  const { t } = useTranslation('staff');
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('metrics.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('metrics.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('metrics.heading')}
        </h1>
        <p className="m-0 text-body">{t('metrics.intro')}</p>
      </div>
      <MarchNumbersBody />
    </PageContainer>
  );
}
