/**
 * SafetyContactsAdminPage: /staff/safety-contacts, where support, admins and the owner keep the
 * safety contacts right: this month's checks, then one country's contacts to confirm, change, add
 * or remove (story S1-E10-13, part b; architecture 1.8.3: owner, admin and support act, moderators
 * read).
 *
 * Every change is logged with before and after values by the database (criterion 6). Plain
 * components, no doodles (staff screens).
 * Who shows it: the router, inside StaffLayout; the menu shows it to roles with the
 * safety_contacts area. What it calls: useStaffSafetyContacts → api/staffSafetyContacts.ts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';
import { useMyStaffAccess } from '@/features/staff/hooks/useMyStaffAccess';

import type { SafetyContactDraft, StaffSafetyContact } from '../api/staffSafetyContacts';
import { useStaffSafetyContacts } from '../hooks/useStaffSafetyContacts';
import { countryName, coveredCountries } from '../lib/countries';
import { registerSafetyTranslations } from '../registerSafetyTranslations';

import { SafetyChecksPanel } from './SafetyChecksPanel';
import { SafetyContactAdminCard } from './SafetyContactAdminCard';
import { SafetyContactForm } from './SafetyContactForm';

/** The page's state for the hook. */
type PageState = ReturnType<typeof useStaffSafetyContacts>;

/**
 * A contact's values for the edit form.
 *
 * @param contact - the contact
 * @returns the draft
 */
function draftFrom(contact: StaffSafetyContact): SafetyContactDraft {
  return {
    id: contact.id,
    countryCode: contact.countryCode,
    kind: contact.kind,
    position: contact.position,
    label: contact.label,
    phoneNumber: contact.phoneNumber ?? '',
    link: contact.link ?? '',
    openingHours: contact.openingHours ?? '',
    openingHoursRo: contact.openingHoursRo ?? '',
    note: contact.note ?? '',
    confidence: contact.confidence,
  };
}

/**
 * An empty contact for a country, placed after its other contacts.
 *
 * @param countryCode - the country
 * @param contacts - the country's contacts
 * @returns the draft
 */
function newDraft(countryCode: string, contacts: StaffSafetyContact[]): SafetyContactDraft {
  const lastPosition = Math.max(0, ...contacts.map((contact) => contact.position));
  return {
    id: null,
    countryCode,
    kind: 'emergency',
    position: lastPosition + 1,
    label: '',
    phoneNumber: '',
    link: '',
    openingHours: '',
    openingHoursRo: '',
    note: '',
    confidence: 'High',
  };
}

/**
 * One country's contacts, or the form when one is being added or changed.
 *
 * @returns the list part of the page
 */
function CountryContacts(props: { state: PageState; countryCode: string; canAct: boolean }) {
  const { state, countryCode, canAct } = props;
  const { t } = useTranslation('safety');
  const [editing, setEditing] = useState<SafetyContactDraft | null>(null);
  const contacts = state.contacts.filter((contact) => contact.countryCode === countryCode);
  if (editing !== null) {
    return (
      <SafetyContactForm
        key={editing.id ?? 'new'}
        initial={editing}
        isSaving={state.isChanging}
        onSave={(draft) => state.change({ kind: 'save', draft })}
        onCancel={() => setEditing(null)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {canAct && (
        <div>
          <Button variant="secondary" onClick={() => setEditing(newDraft(countryCode, contacts))}>
            {t('admin.add')}
          </Button>
        </div>
      )}
      {contacts.length === 0 && <p className="m-0 text-body">{t('admin.noContacts')}</p>}
      <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label={t('admin.listLabel')}>
        {contacts.map((contact) => (
          <SafetyContactAdminCard
            key={contact.id}
            contact={contact}
            canAct={canAct}
            isChanging={state.isChanging}
            onConfirm={() => state.change({ kind: 'confirm', contactId: contact.id })}
            onEdit={() => setEditing(draftFrom(contact))}
            onRemove={(reason) => state.change({ kind: 'remove', contactId: contact.id, reason })}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * The page's body once the contacts are read.
 *
 * @returns the checks, the country picker and the contacts
 */
function PageBody({ state, canAct }: { state: PageState; canAct: boolean }) {
  const { t, i18n } = useTranslation('safety');
  const [countryCode, setCountryCode] = useState('RO');
  const countries = [
    ...new Set([...coveredCountries, ...state.contacts.map((c) => c.countryCode)]),
  ];
  return (
    <>
      <SafetyChecksPanel checks={state.checks} />
      {state.changeFailure !== null && (
        <Notice tone="error">{t(`admin.failures.${state.changeFailure}`)}</Notice>
      )}
      <Select
        id="safety-admin-country"
        label={t('admin.country')}
        isLabelVisible
        value={countryCode}
        onChange={(value) => {
          state.resetFailure();
          setCountryCode(value);
        }}
        options={countries.map((code) => ({
          value: code,
          label: code === 'ZZ' ? t('admin.international') : countryName(code, i18n.language),
        }))}
      />
      <CountryContacts key={countryCode} state={state} countryCode={countryCode} canAct={canAct} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Safety contacts screen
 */
export function SafetyContactsAdminPage() {
  const { i18n } = useTranslation();
  registerSafetyTranslations(i18n);
  const { t } = useTranslation('safety');
  const state = useStaffSafetyContacts();
  const { access } = useMyStaffAccess();
  const canAct = access.areas.some(
    (area) => area.area === 'safety_contacts' && area.access === 'act',
  );
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('admin.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('admin.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('admin.heading')}
        </h1>
        <p className="m-0 text-body">{t(canAct ? 'admin.intro' : 'admin.introReadOnly')}</p>
      </div>
      {state.loadFailure !== null && (
        <Notice tone="error">{t(`admin.failures.${state.loadFailure}`)}</Notice>
      )}
      {state.isLoading && state.loadFailure === null && (
        <p className="m-0 text-meta">{t('admin.loading')}</p>
      )}
      {!state.isLoading && state.loadFailure === null && <PageBody state={state} canAct={canAct} />}
    </PageContainer>
  );
}
