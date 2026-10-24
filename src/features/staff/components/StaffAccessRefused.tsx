/**
 * StaffAccessRefused: what a visitor or a member sees at any /staff address (story S1-E11-01).
 *
 * Who shows it: StaffLayout, instead of the staff frame, when the signed-in person holds no staff
 * role or nobody is signed in. The server has already refused everything on its own
 * (architecture 1.8.1); this page only says so in plain words and offers the way back.
 * Plain components, no doodles (CLAUDE.md, Designs: staff screens).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

/** Why the person is refused. */
export type RefusalReason = 'signed_out' | 'not_staff';

/**
 * Renders the refusal page.
 *
 * @param props.reason - signed out, or signed in without a staff role
 * @returns the page
 */
export function StaffAccessRefused({ reason }: { reason: RefusalReason }) {
  const { t } = useTranslation('staff');
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <main id="main" tabIndex={-1} className="focus:outline-none">
        <PageContainer className="flex max-w-[720px] flex-col gap-4 pt-16 pb-12">
          <title>{t('refused.documentTitle')}</title>
          <Eyebrow>{t('shell.eyebrow')}</Eyebrow>
          <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
            {t('refused.heading')}
          </h1>
          <p className="m-0 text-body">{t(`refused.${reason}`)}</p>
          <p className="m-0">
            <Link
              to={reason === 'signed_out' ? '/sign-in' : '/'}
              className="font-semibold text-link underline"
            >
              {t(reason === 'signed_out' ? 'refused.signIn' : 'refused.goHome')}
            </Link>
          </p>
        </PageContainer>
      </main>
    </div>
  );
}
