/**
 * MessageSettingsSection: "Messages" in Settings: who may start a chat with you and, for 16 and
 * 17-year-olds, "Let adults message me" (story S1-E9-04 criterion 1; S1-E9-03; board Messages
 * 5.5, the "Change" links lead here).
 *
 * Three choices as plain radio buttons, saved the moment one is picked: everyone, people you
 * follow or nobody. The choice shows at once and goes back if the save fails, so it never looks
 * stuck (as AdultMessagesSwitch, S1-E2-06). An adult starts on everyone and an under-18 on people they follow (a
 * proposal). Under-18s read the age rule above the choices; only 16 and 17-year-olds see the
 * adults switch, which only they can change. The section has id "messages", so the Change links
 * on /messages open it. Chats already going carry on whatever is picked (S1-E9-03).
 * Below them, "Emails about messages" (MessageEmailSettings, IDEAS-2 idea 6).
 * Who shows it: SettingsPage. What it calls: useMyMessageSettings and useSaveMessageSettings.
 */
import { useState } from 'react';

import { choiceRowClassName } from '@/components/ui/choiceRowStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { SettingSwitchRow } from '@/features/settings/components/SettingSwitchRow';

import type { MessageAudience, MyMessageSettings } from '../api/messages';
import { useMyMessageSettings } from '../hooks/useMessages';
import { useSaveMessageSettings } from '../hooks/useMessageSettings';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { MessageEmailSettings } from './MessageEmailSettings';

/** The three choices, in the order they are shown. */
const audiences: MessageAudience[] = ['everyone', 'people_i_follow', 'nobody'];

/** What the choices need. */
interface ChoicesProps {
  settings: MyMessageSettings;
  saving: ReturnType<typeof useSaveMessageSettings>;
}

/**
 * The radio group "Who can message you".
 *
 * @returns the fieldset
 */
function AudienceChoices({ settings, saving }: ChoicesProps) {
  const { t } = useMessagesTranslation();
  const [chosen, setChosen] = useState(settings.audience);

  /** Shows the new choice, saves it, and puts the old one back if the save is refused. */
  async function choose(audience: MessageAudience) {
    const before = chosen;
    setChosen(audience);
    await saving.saveAudience(audience).catch(() => setChosen(before));
  }

  return (
    <fieldset
      className="m-0 flex flex-col gap-3 border-0 p-0"
      aria-describedby="message-audience-hint"
    >
      <legend className="mb-2 p-0 text-[15px] font-semibold text-ink">
        {t('settings.whoLegend')}
      </legend>
      {audiences.map((audience) => (
        <label key={audience} className={choiceRowClassName}>
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="message-audience"
              value={audience}
              checked={chosen === audience}
              disabled={saving.isSaving}
              onChange={() => void choose(audience)}
              className="size-6 shrink-0 cursor-pointer accent-(--link)"
            />
            {t(`about.audience.${audience}`)}
          </span>
        </label>
      ))}
      <p id="message-audience-hint" className="m-0 text-[13px] text-meta">
        {t(settings.ageGroup === 'adult' ? 'settings.adultHint' : 'settings.under18Hint')}
      </p>
    </fieldset>
  );
}

/**
 * "Let adults message me", for 16 and 17-year-olds only.
 *
 * @returns the switch with its name and hint (SettingSwitchRow, G11b)
 */
function AdultsSwitch({ settings, saving }: ChoicesProps) {
  const { t } = useMessagesTranslation();
  const [isAllowed, setIsAllowed] = useState(settings.adultsMayMessage);

  /** Shows the new state, saves it, and puts the old one back if the save is refused. */
  async function change(allowed: boolean) {
    setIsAllowed(allowed);
    await saving.saveAdultsMayMessage(allowed).catch(() => setIsAllowed(!allowed));
  }

  return (
    <SettingSwitchRow
      id="settings-adults"
      label={t('settings.adultsLabel')}
      hint={t('about.adultsHint')}
      isOn={isAllowed}
      stateWord={t(isAllowed ? 'settings.on' : 'settings.off')}
      isDisabled={saving.isSaving}
      onToggle={() => void change(!isAllowed)}
    />
  );
}

/** The choices once the setting is known, or a plain line when it can't be read. */
function MessageChoices() {
  const { t } = useMessagesTranslation();
  const settings = useMyMessageSettings();
  const saving = useSaveMessageSettings();
  if (settings.isError) return <Notice tone="error">{t('settings.loadFailed')}</Notice>;
  if (settings.data === undefined) return null;
  return (
    <>
      {settings.data.ageGroup !== 'adult' && <p className="m-0 text-body">{t('rules.minors')}</p>}
      {saving.hasFailed && <Notice tone="error">{t('settings.saveFailed')}</Notice>}
      <AudienceChoices settings={settings.data} saving={saving} />
      {settings.data.ageGroup === 'teen' && (
        <AdultsSwitch settings={settings.data} saving={saving} />
      )}
      <MessageEmailSettings choices={settings.data.email} />
      <p className="m-0 border-t border-border pt-4 text-sm text-body">
        {t('settings.deleteNote')}
      </p>
    </>
  );
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function MessageSettingsSection() {
  const { t } = useMessagesTranslation();
  return (
    <section
      id="messages"
      aria-labelledby="settings-messages-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{t('settings.eyebrow')}</Eyebrow>
        <h2
          id="settings-messages-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('settings.heading')}
        </h2>
        <p className="m-0 text-body">{t('settings.intro')}</p>
      </div>
      <MessageChoices />
    </section>
  );
}
