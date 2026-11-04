/**
 * ParentConsentSummary: "What your parent or guardian agreed to" in Settings, for a member whose
 * account needed a parent's or guardian's yes (bundle IDEAS-2, part c2; idea IDEA-20261101-8).
 *
 * Consent is our legal basis for members under 16 (GDPR art. 8; story S1-E2-03), and the teen is
 * the person it's about, so they see it plainly too: "Your parent or guardian agreed on <date>",
 * a short list of what that covers and that it can be withdrawn. After a withdrawal the same
 * section says so, and what they can still do. Members who never needed consent see nothing.
 * Who shows it: SettingsPage. What it calls: useMyParentConsent (my_parental_consent()).
 */
import { useTranslation } from 'react-i18next';

import { useMyParentConsent } from '../hooks/useMyParentConsent';

/** What the yes covers, in the order a teen reads it. */
const coversKeys = ['coversWrite', 'coversMessages', 'coversData', 'coversWithdraw'];

/** What a teen can still do after a withdrawal. */
const stillKeys = ['stillRead', 'stillKept', 'stillReport', 'stillData'];

/** The words of each state: the dated line, the line before the list, and the list. */
const wordsByStatus = {
  agreed: { dateKey: 'agreedOn', introKey: 'coversIntro', listKeys: coversKeys },
  withdrawn: { dateKey: 'withdrawnOn', introKey: 'stillIntro', listKeys: stillKeys },
};

/**
 * A date in words in the reader's language, Romanian time.
 *
 * @returns "4 November 2026" or "4 noiembrie 2026"
 */
function dateInWords(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(value));
}

/** One plain list of lines from account.json. */
function PlainList({ keys }: { keys: string[] }) {
  const { t } = useTranslation('account');
  return (
    <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-body">
      {keys.map((key) => (
        <li key={key}>{t(`parentConsent.summary.${key}`)}</li>
      ))}
    </ul>
  );
}

/**
 * Renders the section, or nothing when no parent or guardian was ever asked to agree.
 *
 * @returns the section
 */
export function ParentConsentSummary() {
  const { t, i18n } = useTranslation('account');
  const { consent } = useMyParentConsent();
  // Step 1: only an agreed or withdrawn consent, with its date, has anything to show.
  const status = consent?.status ?? null;
  const decidedAt = consent?.decidedAt ?? null;
  if ((status !== 'agreed' && status !== 'withdrawn') || decidedAt === null) return null;
  const date = dateInWords(decidedAt, i18n.language);
  const words = wordsByStatus[status];
  // Step 2: the date, then what it covers, or what still works after a withdrawal.
  return (
    <section
      id="parent-consent"
      aria-labelledby="parent-consent-summary-heading"
      className="flex scroll-mt-24 flex-col gap-3 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="parent-consent-summary-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('parentConsent.summary.heading')}
      </h2>
      <p className="m-0 font-semibold text-ink">
        {t(`parentConsent.summary.${words.dateKey}`, { date })}
      </p>
      <p className="m-0 text-body">{t(`parentConsent.summary.${words.introKey}`)}</p>
      <PlainList keys={words.listKeys} />
    </section>
  );
}
