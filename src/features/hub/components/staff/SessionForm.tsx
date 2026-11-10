/**
 * SessionForm: adds a live session or changes one: the title and the place in English and
 * Romanian, the start, the language, the youngest age group and an optional link (bundle
 * GAPS-12h). English comes first: it is the main language (Robert, 10 Nov 2026).
 *
 * Who shows it: SessionsSection and SessionItem. What it calls: the onSave and onCancel it is
 * given, and lib/sessionTime.ts to read the start field on this device's clock.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import {
  sessionLanguages,
  sessionLimits,
  sessionRatings,
  type SessionDraft,
} from '../../api/hubSessions';
import { fromDateTimeField, toDateTimeField } from '../../lib/sessionTime';
import { useHubTranslation } from '../../registerHubTranslations';

/** What the form needs. */
export interface SessionFormProps {
  /** The session to change, or a draft with id null for a new one. */
  initial: SessionDraft;
  isBusy: boolean;
  onSave: (draft: SessionDraft) => Promise<unknown>;
  onCancel: () => void;
}

/** The four text fields, in the order the form shows them, with each one's limit and language. */
const textFields = [
  { field: 'titleEn', labelKey: 'titleEnLabel', limit: sessionLimits.title, lang: 'en' },
  { field: 'titleRo', labelKey: 'titleRoLabel', limit: sessionLimits.title, lang: 'ro' },
  { field: 'placeEn', labelKey: 'placeEnLabel', limit: sessionLimits.place, lang: 'en' },
  { field: 'placeRo', labelKey: 'placeRoLabel', limit: sessionLimits.place, lang: 'ro' },
] as const;

/**
 * Whether the texts and the start are filled in and the link, when there is one, starts with
 * https://, so Save can switch on. The database checks the same things again.
 *
 * @param draft - the form's values
 * @returns true when the draft can be sent
 */
function isComplete(draft: SessionDraft): boolean {
  const texts = [draft.titleEn, draft.titleRo, draft.placeEn, draft.placeRo, draft.startsAt];
  const link = draft.linkUrl.trim();
  return texts.every((text) => text.trim() !== '') && (link === '' || link.startsWith('https://'));
}

/**
 * The two drop-downs: the language the session is held in and the youngest age group.
 *
 * @returns the drop-downs, side by side where there is room
 */
function SessionChoices({
  idPrefix,
  draft,
  setDraft,
}: {
  idPrefix: string;
  draft: SessionDraft;
  setDraft: (draft: SessionDraft) => void;
}) {
  const { t } = useHubTranslation();
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        id={`${idPrefix}-language`}
        label={t('hubStaff.sessions.languageLabel')}
        isLabelVisible
        options={sessionLanguages.map((code) => ({
          value: code,
          label: t(`hub.sessions.language.${code}`),
        }))}
        value={draft.languageCode}
        onChange={(value) =>
          setDraft({
            ...draft,
            languageCode: sessionLanguages.find((code) => code === value) ?? 'en',
          })
        }
      />
      <Select
        id={`${idPrefix}-rating`}
        label={t('hubStaff.sessions.ratingLabel')}
        isLabelVisible
        options={sessionRatings.map((rating) => ({
          value: rating,
          label: t(`hub.sessions.rating.${rating}`),
        }))}
        value={draft.rating}
        onChange={(value) =>
          setDraft({
            ...draft,
            rating: sessionRatings.find((rating) => rating === value) ?? 'all_ages',
          })
        }
      />
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function SessionForm({ initial, isBusy, onSave, onCancel }: SessionFormProps) {
  const { t } = useHubTranslation();
  const [draft, setDraft] = useState<SessionDraft>(initial);
  const idPrefix = `session-${initial.id ?? 'new'}`;

  /** Saves the draft; the section closes the form once it is saved and shows why when it isn't. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isComplete(draft)) void onSave(draft).catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      {textFields.map((text) => (
        <TextInput
          key={text.field}
          id={`${idPrefix}-${text.field}`}
          label={t(`hubStaff.sessions.${text.labelKey}`)}
          lang={text.lang}
          maxLength={text.limit}
          value={draft[text.field]}
          onChange={(event) => setDraft({ ...draft, [text.field]: event.target.value })}
        />
      ))}
      <TextInput
        id={`${idPrefix}-start`}
        type="datetime-local"
        label={t('hubStaff.sessions.startLabel')}
        hint={t('hubStaff.sessions.startHint')}
        value={toDateTimeField(draft.startsAt)}
        onChange={(event) =>
          setDraft({ ...draft, startsAt: fromDateTimeField(event.target.value) })
        }
      />
      <SessionChoices idPrefix={idPrefix} draft={draft} setDraft={setDraft} />
      <TextInput
        id={`${idPrefix}-link`}
        type="url"
        label={t('hubStaff.sessions.linkLabel')}
        hint={t('hubStaff.sessions.linkHint')}
        maxLength={sessionLimits.link}
        value={draft.linkUrl}
        onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || !isComplete(draft)}>
          {t('hubStaff.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('hubStaff.cancel')}
        </Button>
      </div>
    </form>
  );
}
