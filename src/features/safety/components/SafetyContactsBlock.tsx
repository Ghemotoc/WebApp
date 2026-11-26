/**
 * SafetyContactsBlock: "Is someone in danger right now?", the emergency number, the children's
 * helpline, where to report child sexual abuse material and, where one exists, a youth crisis
 * line, for the reader's country (story S1-E10-13a; board NoticeForm 7.3 and the ModCase
 * safeguarding panel).
 *
 * Which country: the account's (from the connection at sign-up) when signed in, the connection's
 * when signed out (useVisitorCountry); "Not your country?" offers every covered country, Romania
 * first (decided 23 Oct 2026, Q9b). A country with no row shows "Call your local emergency number",
 * the two international directories (country code ZZ: Child Helpline International and INHOPE,
 * Q9c, checked by the CTO on 24 Oct 2026), and the gap is noted for staff (useSafetyContacts). Numbers come only from the database, seeded
 * from the researched file (the story's legal note). No doodles: it sits on reporting screens.
 * Two looks: the full warm box with each contact's kind, hours and official site (ReportDialog,
 * S1-E10-01, and the contact page, /legal/contact, Q9d), and the compact list straight on the page,
 * one line per contact ("112 · Emergency number"), as board J11 draws it on the public report
 * form's side column (isCompact; user stories bundle 10).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSafetyContacts } from '../hooks/useSafetyContacts';
import { useVisitorCountry } from '../hooks/useVisitorCountry';
import { registerSafetyTranslations } from '../registerSafetyTranslations';

import { countryName } from '../lib/countries';

import { CountryPicker } from './CountryPicker';
import { SafetyContactCompactRow, SafetyContactRow } from './SafetyContactRow';
import { dateLocaleFor } from '../../../lib/romania-time';

/**
 * The country's contacts: the full rows under "Contacts for Romania…", or the compact lines with
 * that note under them in the small meta size, as on board J11.
 *
 * @returns the note and the list
 */
function CountryContactList({
  contacts,
  countryCode,
  isCompact,
}: {
  contacts: ReturnType<typeof useSafetyContacts>['contacts'];
  countryCode: string;
  isCompact: boolean;
}) {
  const { t, i18n } = useTranslation('safety');
  const note = t('block.forCountry', { country: countryName(countryCode, i18n.language) });
  if (isCompact) {
    return (
      <>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {contacts.map((contact) => (
            <SafetyContactCompactRow key={contact.id} contact={contact} />
          ))}
        </ul>
        <p className="m-0 type-meta text-ink-muted">{note}</p>
      </>
    );
  }
  return (
    <>
      <p className="m-0 type-body text-ink-muted">{note}</p>
      <ul className="m-0 list-none p-0">
        {contacts.map((contact) => (
          <SafetyContactRow key={contact.id} contact={contact} />
        ))}
      </ul>
    </>
  );
}

/**
 * The list for the country, the fallback, or a short wait.
 *
 * @returns the block's body
 */
function ContactsForCountry({
  countryCode,
  isCompact,
}: {
  countryCode: string | null;
  isCompact: boolean;
}) {
  const { t } = useTranslation('safety');
  const { contacts, isLoading, hasNone, loadFailed } = useSafetyContacts(countryCode);
  if (isLoading) return <p className="m-0 type-body text-ink-muted">{t('block.loading')}</p>;
  if (countryCode !== null && contacts.length > 0) {
    return (
      <CountryContactList contacts={contacts} countryCode={countryCode} isCompact={isCompact} />
    );
  }
  // No row for this country (or no country, or the read failed): the fallback.
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 font-heading type-heading font-bold text-ink-heading">
        {t('block.fallbackCall')}
      </p>
      <p className="m-0 type-body text-ink-muted">
        {hasNone || loadFailed ? t('block.fallbackNoRow') : t('block.fallbackUnknown')}
      </p>
      <InternationalDirectories />
    </div>
  );
}

/** The country code that holds the international fallback rows (ISO 3166's "unknown"). */
const internationalCountryCode = 'ZZ';

/**
 * The two international directories, for a country with no contacts of its own: where to find a
 * children's helpline and where to report child sexual abuse material (decided 23 Oct 2026, Q9c).
 *
 * @returns the list, or nothing while it loads or when the rows are missing
 */
function InternationalDirectories() {
  const { t, i18n } = useTranslation('safety');
  const { contacts } = useSafetyContacts(internationalCountryCode);
  const firstContact = contacts[0];
  if (firstContact === undefined) return null;
  // The check date comes from the rows themselves, so it stays right when they are re-checked.
  const checkedOn = new Intl.DateTimeFormat(dateLocaleFor(i18n.language), {
    dateStyle: 'long',
  }).format(new Date(`${firstContact.lastCheckedOn}T12:00:00`));
  return (
    <>
      <p className="m-0 mt-3 type-body text-ink-muted">
        {t('block.international', { date: checkedOn })}
      </p>
      <ul className="m-0 list-none p-0">
        {contacts.map((contact) => (
          <SafetyContactRow key={contact.id} contact={contact} />
        ))}
      </ul>
    </>
  );
}

/** The two looks of the block's box. */
const fullBoxClasses =
  'flex flex-col gap-4 rounded-card border border-(--warning-border) bg-(--warning-bg) p-4';
const compactClasses = 'flex flex-col gap-2';

/**
 * Renders the block.
 *
 * @param props.isCompact - true for the one-line rows straight on the page (board J11)
 * @returns the section with its heading, the contacts and the country picker
 */
export function SafetyContactsBlock({ isCompact = false }: { isCompact?: boolean }) {
  const { i18n } = useTranslation();
  registerSafetyTranslations(i18n);
  const { t } = useTranslation('safety');
  const visitor = useVisitorCountry();
  const [chosenCountry, setChosenCountry] = useState<string | null>(null);
  const countryCode = chosenCountry ?? visitor.countryCode;

  return (
    <section
      aria-labelledby="safety-contacts-heading"
      className={isCompact ? compactClasses : fullBoxClasses}
    >
      <h2
        id="safety-contacts-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('block.heading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('block.intro')}</p>
      {visitor.isKnown ? (
        <ContactsForCountry countryCode={countryCode} isCompact={isCompact} />
      ) : null}
      <CountryPicker chosen={chosenCountry} onChoose={setChosenCountry} />
    </section>
  );
}
