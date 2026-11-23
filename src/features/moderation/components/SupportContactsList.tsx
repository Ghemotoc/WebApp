/**
 * SupportContactsList: the helplines and emergency numbers for the person in a safeguarding case,
 * for their country, or Romania's with a line saying so (story S1-E10-10; criterion 1; contacts
 * seeded from research G4 in S1-E10-13a).
 *
 * Who shows it: SafeguardingPanel. What it reads: the SupportContacts it is given.
 */
import { useTranslation } from 'react-i18next';

import type { SupportContacts } from '../api/safeguarding';

/**
 * Renders the list.
 *
 * @param props.contacts - the contacts and whose country they are for
 * @returns the list
 */
export function SupportContactsList({ contacts }: { contacts: SupportContacts }) {
  const { t } = useTranslation('moderation');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 type-body font-bold text-ink-heading">
        {t('safeguarding.contactsHeading', { country: contacts.countryCode })}
      </h3>
      {contacts.isFallback && (
        <p className="m-0 type-body text-ink-muted">{t('safeguarding.contactsFallback')}</p>
      )}
      {contacts.contacts.length === 0 && (
        <p className="m-0 text-ink-muted">{t('safeguarding.noContacts')}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {contacts.contacts.map((contact) => (
          <li
            key={`${contact.kind}-${contact.label}`}
            className="flex flex-col gap-1 text-ink-muted"
          >
            <span className="type-body text-ink-muted">
              {t(`safeguarding.kinds.${contact.kind}`, { defaultValue: contact.kind })}
            </span>
            <span className="font-semibold text-ink">
              {contact.label}
              {contact.phoneNumber !== null && (
                <>
                  {' · '}
                  <a
                    href={`tel:${contact.phoneNumber.replace(/\s+/g, '')}`}
                    className="text-link underline"
                  >
                    {contact.phoneNumber}
                  </a>
                </>
              )}
            </span>
            {contact.openingHours !== null && (
              <span className="type-body text-ink-muted">{contact.openingHours}</span>
            )}
            {contact.link !== null && (
              <a
                href={contact.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit type-body text-link underline"
              >
                {contact.link}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
