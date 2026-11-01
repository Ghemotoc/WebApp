/**
 * PrivacySettingsSection: "Privacy" in Settings (story S1-E13-01 criteria 1 and 2; board 6.3, the
 * Privacy tab, drawn here as a panel on the one Settings page like the others).
 *
 * Top to bottom as on the board: the intro, the under-18 note, "Who can see your profile", "Who
 * can message you", "Show when I'm online" and "Who can see your library". Every choice saves at
 * once. Who can message you belongs to Messages (S1-E9-04), so here it is one line with Change,
 * which jumps to that panel: one place to change it, never two controls that could disagree.
 * The section has id "privacy", so links such as the Library's Change open it.
 * Who shows it: SettingsPage. What it calls: usePrivacySettings and useSavePrivacySettings.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { registerMessagesTranslations } from '@/features/messages/registerMessagesTranslations';

import { libraryAudiences, profileAudiences, type PrivacySettings } from '../api/privacy';
import { usePrivacySettings, useSavePrivacySettings } from '../hooks/usePrivacySettings';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

import { AudienceRadios } from './AudienceRadios';
import { OnlineStatusSwitch } from './OnlineStatusSwitch';

/** "Who can message you: Everyone · Change", pointing at the Messages panel. */
function MessageAudienceLine({ settings }: { settings: PrivacySettings }) {
  const { t } = usePrivacyTranslation();
  // The choice's words are Messages' own, so they read the same in both panels.
  registerMessagesTranslations(useTranslation().i18n);
  return (
    <div className="flex flex-col gap-1 border-t border-border pt-4">
      <p className="m-0 text-[15px] font-semibold text-ink">{t('messages.legend')}</p>
      <p className="m-0 flex flex-wrap items-center gap-x-3 text-[15px] text-body">
        <span>{t(`about.audience.${settings.messageAudience}`, { ns: 'messages' })}</span>
        <Link
          to="/settings#messages"
          aria-label={t('messages.changeLabel')}
          className="inline-flex min-h-6 items-center font-semibold text-link underline"
        >
          {t('messages.change')}
        </Link>
      </p>
    </div>
  );
}

/** The four settings once they are known. */
function PrivacyChoices({ settings }: { settings: PrivacySettings }) {
  const { t } = usePrivacyTranslation();
  const saving = useSavePrivacySettings();
  return (
    <>
      {settings.isUnder18 && <Notice tone="info">{t('settings.under18')}</Notice>}
      {saving.hasFailed && <Notice tone="error">{t('settings.saveFailed')}</Notice>}
      <AudienceRadios
        name="profile-audience"
        legend={t('profile.legend')}
        hint={t('profile.hint')}
        choices={profileAudiences}
        labelOf={(choice) => t(`profile.${choice}`)}
        under18Default="people_i_follow"
        saved={settings.profileAudience}
        isSaving={saving.isSaving}
        onSave={saving.saveProfile}
      />
      <MessageAudienceLine settings={settings} />
      <OnlineStatusSwitch
        saved={settings.showsOnlineStatus}
        isSaving={saving.isSaving}
        onSave={saving.saveOnline}
      />
      <div className="border-t border-border pt-4">
        <AudienceRadios
          name="library-audience"
          legend={t('library.legend')}
          hint={t('library.hint')}
          choices={libraryAudiences}
          labelOf={(choice) => t(`library.${choice}`)}
          under18Default="only_me"
          saved={settings.libraryAudience}
          isSaving={saving.isSaving}
          onSave={saving.saveLibrary}
        />
      </div>
    </>
  );
}

/** The choices, a plain line when they can't be read, or nothing while they load. */
function PrivacyBody() {
  const { t } = usePrivacyTranslation();
  const settings = usePrivacySettings();
  if (settings.isError) return <Notice tone="error">{t('settings.loadFailed')}</Notice>;
  if (settings.data === undefined) return null;
  return <PrivacyChoices settings={settings.data} />;
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function PrivacySettingsSection() {
  const { t } = usePrivacyTranslation();
  return (
    <section
      id="privacy"
      aria-labelledby="settings-privacy-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{t('settings.eyebrow')}</Eyebrow>
        <h2
          id="settings-privacy-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('settings.heading')}
        </h2>
        <p className="m-0 text-body">{t('settings.intro')}</p>
      </div>
      <PrivacyBody />
    </section>
  );
}
