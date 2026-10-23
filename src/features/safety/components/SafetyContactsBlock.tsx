/**
 * SafetyContactsBlock: "Is someone in danger right now?", the emergency number, the children's
 * helpline, where to report child sexual abuse material and, where one exists, a youth crisis
 * line, for the reader's country (story S1-E10-13a; board NoticeForm 7.3 and the ModCase
 * safeguarding panel).
 *
 * Which country: the account's (from the connection at sign-up) when signed in, the connection's
 * when signed out (useVisitorCountry); "Not your country?" offers every covered country, Romania
 * first (decided 23 Oct 2026, Q9b). A country with no row shows "Call your local emergency number"
 * and the gap is noted for staff (useSafetyContacts). Numbers come only from the database, seeded
 * from the researched file (the story's legal note). No doodles: it sits on reporting screens.
 * Who shows it: ReportDialog (S1-E10-01) and the contact page (/legal/contact, Q9d); later the
 * public report form (S1-E10-02) and the safeguarding panel (S1-E10-10).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSafetyContacts } from '../hooks/useSafetyContacts';
import { useVisitorCountry } from '../hooks/useVisitorCountry';
import { registerSafetyTranslations } from '../registerSafetyTranslations';

import { countryName } from '../lib/countries';

import { CountryPicker } from './CountryPicker';
import { SafetyContactRow } from './SafetyContactRow';

/**
 * The list for the country, the fallback, or a short wait.
 *
 * @returns the block's body
 */
function ContactsForCountry({ countryCode }: { countryCode: string | null }) {
  const { t, i18n } = useTranslation('safety');
  const { contacts, isLoading, hasNone, loadFailed } = useSafetyContacts(countryCode);
  if (isLoading) return <p className="m-0 text-sm text-meta">{t('block.loading')}</p>;
  if (countryCode !== null && contacts.length > 0) {
    return (
      <>
        <p className="m-0 text-sm text-meta">
          {t('block.forCountry', { country: countryName(countryCode, i18n.language) })}
        </p>
        <ul className="m-0 list-none p-0">
          {contacts.map((contact) => (
            <SafetyContactRow key={contact.id} contact={contact} />
          ))}
        </ul>
      </>
    );
  }
  // No row for this country (or no country, or the read failed): the fallback.
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('block.fallbackCall')}
      </p>
      <p className="m-0 text-sm text-body">
        {hasNone || loadFailed ? t('block.fallbackNoRow') : t('block.fallbackUnknown')}
      </p>
    </div>
  );
}

/**
 * Renders the block.
 *
 * @returns the section with its heading, the contacts and the country picker
 */
export function SafetyContactsBlock() {
  const { i18n } = useTranslation();
  registerSafetyTranslations(i18n);
  const { t } = useTranslation('safety');
  const visitor = useVisitorCountry();
  const [chosenCountry, setChosenCountry] = useState<string | null>(null);
  const countryCode = chosenCountry ?? visitor.countryCode;

  return (
    <section
      aria-labelledby="safety-contacts-heading"
      className="flex flex-col gap-4 rounded-card border border-(--warning-border) bg-(--warning-bg) p-5"
    >
      <h2 id="safety-contacts-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('block.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('block.intro')}</p>
      {visitor.isKnown ? <ContactsForCountry countryCode={countryCode} /> : null}
      <CountryPicker chosen={chosenCountry} onChoose={setChosenCountry} />
    </section>
  );
}
