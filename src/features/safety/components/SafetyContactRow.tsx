/**
 * SafetyContactRow: one contact in the "Is someone in danger right now?" block (story S1-E10-13a).
 *
 * Board (NoticeForm 7.3, ModCase safeguarding panel): the kind as a small label, the official
 * name, the number and the opening hours, and "Official site". The number is a phone link on a
 * touch device and plain, selectable text elsewhere (acceptance criterion); the site opens in a
 * new tab with no tracking (CLAUDE.md rule 7; rel="noopener noreferrer").
 * The compact row (SafetyContactCompactRow, bundle 10, board J11) is one line, "112 · Emergency
 * number", with the opening hours under it in small type, for the public report form's side column; a contact without a number (an online
 * reporting line) shows its name as the link to its official site.
 * Who shows it: SafetyContactsBlock.
 */
import { useTranslation } from 'react-i18next';

import type { SafetyContact } from '../api/safetyContacts';
import { isTouchDevice, telephoneHref } from '../lib/phoneLink';

/** The number's look in the full row: big and bold, easy to read out. */
const bigNumberClasses = 'font-heading type-heading font-bold text-ink-heading';

/**
 * The number as a link or as text.
 *
 * @param props.classes - the number's look (big in the full row, bold body text in the compact one)
 * @returns a tel: link on touch devices, a selectable span elsewhere
 */
function PhoneNumber({
  phoneNumber,
  label,
  classes = bigNumberClasses,
}: {
  phoneNumber: string;
  label: string;
  classes?: string;
}) {
  const { t } = useTranslation('safety');
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
 * Picks the opening hours in the page's language.
 *
 * @param contact - the contact
 * @param language - the page's language
 * @returns the Romanian hours on a Romanian page when staff wrote them (S1-E10-13b), else the
 *   English ones, or null when the contact has none
 */
function openingHoursFor(contact: SafetyContact, language: string): string | null {
  if (language.startsWith('ro') && contact.openingHoursRo !== null) return contact.openingHoursRo;
  return contact.openingHours;
}

/**
 * Renders the row.
 *
 * @param props.contact - the contact
 * @returns a list item
 */
export function SafetyContactRow({ contact }: { contact: SafetyContact }) {
  const { t, i18n } = useTranslation('safety');
  const openingHours = openingHoursFor(contact, i18n.language);
  return (
    <li className="flex flex-col gap-1 border-t border-border py-3 first:border-t-0 first:pt-0">
      <span className="type-meta font-semibold text-ink-muted">{t(`kinds.${contact.kind}`)}</span>
      <span className="text-ink">{contact.label}</span>
      {contact.phoneNumber !== null && (
        <PhoneNumber phoneNumber={contact.phoneNumber} label={contact.label} />
      )}
      {openingHours !== null && <span className="type-body text-ink-muted">{openingHours}</span>}
      {contact.link !== null && (
        <a
          href={contact.link}
          target="_blank"
          rel="noopener noreferrer"
          className="type-body font-semibold text-link underline"
        >
          {t('block.officialSite', { label: contact.label })}
        </a>
      )}
    </li>
  );
}

/**
 * Renders the compact row: the number in bold, a middot and the name, the hours under them; or, for a contact without a
 * number, the name as the link to its official site (opens in a new tab, no tracking).
 *
 * @param props.contact - the contact
 * @returns the list item
 */
export function SafetyContactCompactRow({ contact }: { contact: SafetyContact }) {
  const { t, i18n } = useTranslation('safety');
  const openingHours = openingHoursFor(contact, i18n.language);
  // Step 1: a phone line reads "112 · Emergency number", with its hours under it, so a person
  // knows the line is open before they call (S1-E10-13a: every contact shows its hours).
  if (contact.phoneNumber !== null) {
    return (
      <li className="type-body text-ink">
        <PhoneNumber
          phoneNumber={contact.phoneNumber}
          label={contact.label}
          classes="font-semibold text-ink-heading"
        />
        <span aria-hidden="true"> · </span>
        <span className="sr-only">, </span>
        {contact.label}
        {openingHours !== null && (
          <span className="block type-meta text-ink-muted">{openingHours}</span>
        )}
      </li>
    );
  }
  // Step 2: an online line has no number, so its name links to the official site.
  return (
    <li className="type-body text-ink">
      {contact.link === null ? (
        contact.label
      ) : (
        <a
          href={contact.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link underline"
        >
          {t('block.officialSite', { label: contact.label })}
        </a>
      )}
    </li>
  );
}
