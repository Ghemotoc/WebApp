/**
 * SafetyContactRow: one contact in the "Is someone in danger right now?" block (story S1-E10-13a).
 *
 * Board (NoticeForm 7.3, ModCase safeguarding panel): the kind as a small label, the official
 * name, the number and the opening hours, and "Official site". The number is a phone link on a
 * touch device and plain, selectable text elsewhere (acceptance criterion); the site opens in a
 * new tab with no tracking (CLAUDE.md rule 7; rel="noopener noreferrer").
 * Who shows it: SafetyContactsBlock.
 */
import { useTranslation } from 'react-i18next';

import type { SafetyContact } from '../api/safetyContacts';
import { isTouchDevice, telephoneHref } from '../lib/phoneLink';

/**
 * The number as a link or as text.
 *
 * @returns a tel: link on touch devices, a selectable span elsewhere
 */
function PhoneNumber({ phoneNumber, label }: { phoneNumber: string; label: string }) {
  const { t } = useTranslation('safety');
  const classes = 'font-heading text-[22px] font-bold text-heading';
  if (isTouchDevice(typeof window === 'undefined' ? undefined : window.matchMedia)) {
    return (
      <a
        href={telephoneHref(phoneNumber)}
        aria-label={t('block.call', { label, number: phoneNumber })}
        className={`${classes} underline`}
      >
        {phoneNumber}
      </a>
    );
  }
  return <span className={`${classes} select-all`}>{phoneNumber}</span>;
}

/**
 * Renders the row.
 *
 * @param props.contact - the contact
 * @returns a list item
 */
export function SafetyContactRow({ contact }: { contact: SafetyContact }) {
  const { t, i18n } = useTranslation('safety');
  // The Romanian page shows the Romanian opening hours when staff wrote them (S1-E10-13b).
  const openingHours =
    i18n.language.startsWith('ro') && contact.openingHoursRo !== null
      ? contact.openingHoursRo
      : contact.openingHours;
  return (
    <li className="flex flex-col gap-1 border-t border-border py-3 first:border-t-0 first:pt-0">
      <span className="text-[13px] font-semibold text-meta">{t(`kinds.${contact.kind}`)}</span>
      <span className="text-ink">{contact.label}</span>
      {contact.phoneNumber !== null && (
        <PhoneNumber phoneNumber={contact.phoneNumber} label={contact.label} />
      )}
      {openingHours !== null && <span className="text-sm text-meta">{openingHours}</span>}
      {contact.link !== null && (
        <a
          href={contact.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-link underline"
        >
          {t('block.officialSite', { label: contact.label })}
        </a>
      )}
    </li>
  );
}
