/**
 * BirthdaySettingsSection: Settings › Birthday, an optional day and month for a birthday greeting
 * (story S1-E2-12; Robert, 25 Oct 2026, 07:08 to 07:11).
 *
 * It explains what the birthday is for, that only the owner sees it and that it never has a
 * year, and how to get it corrected: the person can change or remove it here at any time, or ask
 * support. The year of birth from sign-up is never changed (the database refuses it).
 * Who shows it: SettingsPage, for anyone signed in. What it calls: hooks/useMyBirthday.ts and
 * BirthdayForm.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { useMyBirthday } from '../hooks/useMyBirthday';

import { BirthdayForm } from './BirthdayForm';

/**
 * Renders the section.
 *
 * @returns the Birthday section
 */
export function BirthdaySettingsSection() {
  const { t } = useTranslation('account');
  const birthday = useMyBirthday();
  const saved = birthday.birthday;
  return (
    <section
      aria-labelledby="settings-birthday-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="settings-birthday-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('birthday.heading')}
      </h2>
      <p className="m-0 text-body">{t('birthday.intro')}</p>
      <p className="m-0 text-[13px] text-meta">{t('birthday.private')}</p>
      {birthday.loadFailed && <Notice tone="error">{t('errors.loadFailed')}</Notice>}
      {saved !== null && (
        <BirthdayForm key={`${saved.month}-${saved.day}`} saved={saved} birthday={birthday} />
      )}
    </section>
  );
}
