/**
 * SanctionNotice: "Your account is suspended until …" (or paused from reporting), shown to a
 * signed-in person with a live sanction (story S1-E10-06).
 *
 * Why: a suspended person can still sign in, read and download their data, but can't post,
 * comment or message (the story's first criterion), so every page says so plainly. A warning is
 * not shown here: it reaches the person as a statement of reasons (S1-E10-04). A banned person
 * can't sign in at all (Supabase's own ban), so the notice never shows a ban.
 * Who shows it: AppLayout, under the other notices. What it calls: useMySanctions.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useMySanctions } from '../hooks/useMySanctions';

/**
 * Renders the notice, or nothing.
 *
 * @returns one notice per live suspension or reporting pause
 */
export function SanctionNotice() {
  const { t, i18n } = useTranslation('account');
  const shown = useMySanctions().filter(
    (sanction) => sanction.kind === 'suspension' || sanction.kind === 'reporting_pause',
  );
  if (shown.length === 0) return null;
  const whenText = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(isoTime),
    );
  return (
    <PageContainer className="flex flex-col gap-3 pt-6">
      {shown.map((sanction) => {
        const until = whenText(sanction.endsAt ?? '');
        return (
          <Notice
            key={sanction.kind}
            tone="warning"
            title={t(`sanction.${sanction.kind}.title`, { until })}
          >
            {t(`sanction.${sanction.kind}.body`, { until })}
          </Notice>
        );
      })}
    </PageContainer>
  );
}
