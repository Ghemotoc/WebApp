/**
 * SuggestMeSwitch: "Suggest me and my stories to other people" in Settings › Privacy (stories
 * S1-E5-11 and S1-E2-03b, bundle LOOK-4c; Robert, 6 Nov 2026: on for 18+, off for under-18s,
 * who turn it on themselves; under-16s are suggested only with their parent's expressed yes).
 *
 * A checkbox saved the moment it changes, like "Show when I'm online". For a 13 to 15-year-old
 * whose parent agreed to the account, a line under it says where the parent's separate yes
 * stands: "Ask your parent" with a button, "Waiting for your parent" with "Send it again", or
 * "Your parent agreed". Until then nothing is suggested, and the line says so.
 * Who uses it: PrivacySettingsSection. What it calls: onSave (set_suggest_me()) and
 * sendSpotlightRequest() (POST /api/parent-consent/spotlight-request).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  ParentConsentError,
  sendSpotlightRequest,
} from '@/features/parent-consent/api/parentConsent';

import type { PrivacySettings } from '../api/privacy';
import { privacySettingsKey } from '../hooks/usePrivacySettings';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** What the switch needs. */
interface SuggestMeSwitchProps {
  settings: PrivacySettings;
  isSaving: boolean;
  onSave: (shouldSuggest: boolean) => Promise<void>;
}

/**
 * Asking the parent: posts to our server, then reads the settings again so the line moves on.
 *
 * @returns ask(), isAsking, hasSent and the failure's reason
 */
function useAskParent() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const asking = useMutation({
    mutationFn: async () => sendSpotlightRequest(await requireClient()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: privacySettingsKey(userId) }),
  });
  const failure = asking.error instanceof ParentConsentError ? asking.error.failure : 'unavailable';
  return {
    ask: () => asking.mutate(),
    isAsking: asking.isPending,
    hasSent: asking.isSuccess,
    failure: asking.isError ? failure : null,
  };
}

/**
 * The line about the parent's yes, for a 13 to 15-year-old with the switch on.
 *
 * @returns the line and its button, or nothing when no parent needs asking
 */
function ParentLine({ settings }: { settings: PrivacySettings }) {
  const { t } = usePrivacyTranslation();
  const asking = useAskParent();
  if (settings.parentSpotlight === 'not_needed' || !settings.canAskParent) return null;
  if (settings.parentSpotlight === 'agreed') {
    return <p className="m-0 text-[13px] text-meta">{t('suggest.parentAgreed')}</p>;
  }
  const isAsked = settings.parentSpotlight === 'asked';
  return (
    <div className="flex flex-col gap-2">
      <Notice tone="info">{t(isAsked ? 'suggest.waiting' : 'suggest.askParent')}</Notice>
      {asking.failure !== null && (
        <Notice tone="error">{t(`suggest.failures.${asking.failure}`)}</Notice>
      )}
      {asking.hasSent && (
        <p className="m-0 text-[13px] text-meta" role="status">
          {t('suggest.sent')}
        </p>
      )}
      <Button
        variant="secondary"
        className="self-start"
        disabled={asking.isAsking}
        onClick={asking.ask}
      >
        {t(isAsked ? 'suggest.askAgain' : 'suggest.askButton')}
      </Button>
    </div>
  );
}

/**
 * Renders the checkbox with its label, hint and, for under-16s, the parent's line.
 *
 * @returns the switch row
 */
export function SuggestMeSwitch({ settings, isSaving, onSave }: SuggestMeSwitchProps) {
  const { t } = usePrivacyTranslation();
  const [isOn, setIsOn] = useState(settings.suggestMe);

  /** Shows the new state, saves it, and puts the old one back if the save is refused. */
  async function change(shouldSuggest: boolean) {
    setIsOn(shouldSuggest);
    await onSave(shouldSuggest).catch(() => setIsOn(!shouldSuggest));
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-start gap-3">
        <input
          id="privacy-suggest-me"
          type="checkbox"
          checked={isOn}
          disabled={isSaving}
          aria-describedby="privacy-suggest-hint"
          onChange={(event) => void change(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="privacy-suggest-me" className="text-[15px] text-body">
          {t('suggest.label')}
        </label>
      </div>
      <p id="privacy-suggest-hint" className="m-0 text-[13px] text-meta">
        {t('suggest.hint')}
      </p>
      {isOn && <ParentLine settings={settings} />}
    </div>
  );
}
