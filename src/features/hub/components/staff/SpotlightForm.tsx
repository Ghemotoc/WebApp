/**
 * SpotlightForm: invites a writer to be writer of the week: the username, the first day and one
 * line on why in English and Romanian (bundle GAPS-12e). English comes first: it is the main
 * language (Robert, 10 Nov 2026).
 *
 * Who shows it: SpotlightsSection. What it calls: the onInvite and onCancel it is given.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import { spotlightReasonLimit, type SpotlightDraft } from '../../api/hubSpotlight';
import { useHubTranslation } from '../../registerHubTranslations';

/** What the form needs. */
export interface SpotlightFormProps {
  isBusy: boolean;
  onInvite: (draft: SpotlightDraft) => Promise<unknown>;
  onCancel: () => void;
}

/** An empty invitation. */
const emptyDraft: SpotlightDraft = { handle: '', startsOn: '', reasonEn: '', reasonRo: '' };

/**
 * Whether every field is filled in, so the button can switch on. The database checks again.
 *
 * @param draft - the form's values
 * @returns true when the draft can be sent
 */
function isComplete(draft: SpotlightDraft): boolean {
  return Object.values(draft).every((text) => text.trim() !== '');
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function SpotlightForm({ isBusy, onInvite, onCancel }: SpotlightFormProps) {
  const { t } = useHubTranslation();
  const [draft, setDraft] = useState<SpotlightDraft>(emptyDraft);

  /** Sends the invitation; the section closes the form once sent and shows why when it isn't. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isComplete(draft)) void onInvite(draft).catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      <TextInput
        id="spotlight-handle"
        label={t('hubStaff.spotlights.handleLabel')}
        hint={t('hubStaff.spotlights.handleHint')}
        autoComplete="off"
        maxLength={40}
        value={draft.handle}
        onChange={(event) => setDraft({ ...draft, handle: event.target.value })}
      />
      <TextInput
        id="spotlight-day"
        type="date"
        label={t('hubStaff.spotlights.dayLabel')}
        hint={t('hubStaff.spotlights.dayHint')}
        value={draft.startsOn}
        onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })}
      />
      <TextInput
        id="spotlight-reason-en"
        label={t('hubStaff.spotlights.reasonEnLabel')}
        lang="en"
        maxLength={spotlightReasonLimit}
        value={draft.reasonEn}
        onChange={(event) => setDraft({ ...draft, reasonEn: event.target.value })}
      />
      <TextInput
        id="spotlight-reason-ro"
        label={t('hubStaff.spotlights.reasonRoLabel')}
        lang="ro"
        maxLength={spotlightReasonLimit}
        value={draft.reasonRo}
        onChange={(event) => setDraft({ ...draft, reasonRo: event.target.value })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || !isComplete(draft)}>
          {t('hubStaff.spotlights.invite')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('hubStaff.cancel')}
        </Button>
      </div>
    </form>
  );
}
