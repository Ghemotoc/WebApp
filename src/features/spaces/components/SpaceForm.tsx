/**
 * SpaceForm: the fields for starting or changing a space: name, description, rules, banner, who
 * can read (under-16 spaces only), who can post and how people join (bundle FORUMS-2, part a;
 * S1-E8-06 criteria 1 to 5; design/boards/Space.dc.html's "Create a space" card).
 *
 * Age rules (S1-E8-06; the board's "Who can join" box): the space takes the age group of whoever
 * starts it, from age_band(). A 16+ space can be read by everybody (the database's
 * spaces_16_plus_read_by_everybody rule), so only an under-16 owner chooses who can read.
 * A class space (bundle CLASSES, part a; S1-E8-11) is always private to its members, who post and
 * join only with the teacher's code, so its form shows a note in place of the three choices and
 * keeps the settings the database requires (spaces_class_is_private).
 * A refusal about the name shows under the name; any other shows above the buttons.
 * Who uses it: NewSpacePage and SpaceSettingsPage, which say what happens on "Create space" or
 * "Save changes". What it calls: SpaceNameField, SpaceBannerChoice, SpaceRadioGroup.
 */
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import type { SpaceAgeGroup, SpaceError, SpaceSettings } from '../api/spaces';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceBannerChoice } from './SpaceBannerChoice';
import { SpaceNameField } from './SpaceNameField';
import { SpaceRadioGroup } from './SpaceRadioGroup';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface SpaceFormProps {
  /** The settings it starts with: the defaults for a new space, the space's own when changing. */
  initial: SpaceSettings;
  /** The space's age group (the owner's, for a new one). */
  ageGroup: SpaceAgeGroup;
  /** The space's current name when changing it, else null. */
  ownName: string | null;
  /** True for a class space: no choices about readers, posting or joining. */
  isClass?: boolean;
  submitLabel: string;
  onSubmit: (settings: SpaceSettings) => Promise<unknown>;
  failure: SpaceError | null;
  isRunning: boolean;
  /** Where "Cancel" goes. */
  cancelTo: string;
}

/** The "Who can join" box: the age rules in plain words (the board's lilac panel). */
function WhoJoinsBox() {
  const { t } = useSpacesTranslation();
  return (
    <section
      aria-labelledby="space-who-joins"
      className="flex flex-col gap-2 rounded-[20px] bg-tint px-5 py-4"
    >
      <h2 id="space-who-joins" className="m-0 text-base font-semibold text-heading">
        {t('form.whoJoins')}
      </h2>
      <p className="m-0 text-sm text-body">{t('form.whoJoinsText')}</p>
      <p className="m-0 text-sm text-body">{t('form.whoJoinsTurning16')}</p>
    </section>
  );
}

/** In a class space's form: why there are no choices (only the class reads and posts). */
function ClassSpaceBox() {
  const { t } = useSpacesTranslation();
  return (
    <section
      aria-labelledby="space-class-note"
      className="flex flex-col gap-2 rounded-[20px] bg-tint px-5 py-4"
    >
      <h2 id="space-class-note" className="m-0 text-base font-semibold text-heading">
        {t('form.classTitle')}
      </h2>
      <p className="m-0 text-sm text-body">{t('form.classText')}</p>
    </section>
  );
}

/**
 * The three choices: who can read (under-16 spaces only), who can post and how people join.
 *
 * @returns the radio groups
 */
function SpaceChoices({
  settings,
  ageGroup,
  change,
}: {
  settings: SpaceSettings;
  ageGroup: SpaceAgeGroup;
  change: (patch: Partial<SpaceSettings>) => void;
}) {
  const { t } = useSpacesTranslation();
  return (
    <>
      {ageGroup === 'under_16' && (
        <SpaceRadioGroup
          legend={t('form.readers')}
          value={settings.readers}
          onChange={(readers) => change({ readers })}
          options={[
            {
              value: 'members',
              label: t('form.readersMembers'),
              note: t('form.readersMembersNote'),
            },
            {
              value: 'everybody',
              label: t('form.readersEverybody'),
              note: t('form.readersEverybodyNote'),
            },
          ]}
        />
      )}
      <SpaceRadioGroup
        legend={t('form.posting')}
        value={settings.posting}
        onChange={(posting) => change({ posting })}
        options={[
          { value: 'anyone', label: t('form.postingAnyone'), note: t('form.postingAnyoneNote') },
          { value: 'members', label: t('form.postingMembers'), note: t('form.postingMembersNote') },
        ]}
      />
      <SpaceRadioGroup
        legend={t('form.joining')}
        value={settings.joining}
        onChange={(joining) => change({ joining })}
        options={[
          { value: 'approve', label: t('form.joiningApprove') },
          { value: 'open', label: t('form.joiningOpen') },
        ]}
      />
    </>
  );
}

/**
 * The description and rules boxes.
 *
 * @returns the two text areas
 */
function SpaceTexts({
  settings,
  change,
}: {
  settings: SpaceSettings;
  change: (patch: Partial<SpaceSettings>) => void;
}) {
  const { t } = useSpacesTranslation();
  const descriptionId = useId();
  const rulesId = useId();
  return (
    <>
      <Textarea
        id={descriptionId}
        label={t('form.description')}
        value={settings.description}
        maxLength={300}
        onChange={(event) => change({ description: event.target.value })}
      />
      <Textarea
        id={rulesId}
        label={t('form.rules')}
        hint={t('form.rulesHint')}
        value={settings.rules}
        maxLength={2000}
        className="min-h-32"
        onChange={(event) => change({ rules: event.target.value })}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the fields, the refusal and the two buttons
 */
export function SpaceForm(props: SpaceFormProps) {
  const { t } = useSpacesTranslation();
  const [settings, setSettings] = useState(props.initial);
  const change = (patch: Partial<SpaceSettings>) =>
    setSettings((current) => ({ ...current, ...patch }));
  const field = props.failure?.details.field;
  const nameProblem = field?.field === 'name' ? field : null;
  const general =
    props.failure === null || nameProblem !== null ? null : t(...spaceFailureText(props.failure));

  /** Sends the settings; the page says what happens next and the refusal shows from failure. */
  function send(event: FormEvent) {
    event.preventDefault();
    // A 16+ space is read by everybody (spaces_16_plus_read_by_everybody); a class space only
    // by its members (spaces_class_is_private), so it keeps the settings it has.
    let readers = settings.readers;
    if (props.ageGroup === '16_plus' && props.isClass !== true) readers = 'everybody';
    void props.onSubmit({ ...settings, readers }).catch(errorShownByHook);
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-6">
      <SpaceNameField
        value={settings.name}
        onChange={(name) => change({ name })}
        ownName={props.ownName}
        sentProblem={nameProblem}
      />
      <SpaceTexts settings={settings} change={change} />
      <SpaceBannerChoice value={settings.banner} onChange={(banner) => change({ banner })} />
      {props.isClass === true ? (
        <ClassSpaceBox />
      ) : (
        <>
          <WhoJoinsBox />
          <SpaceChoices settings={settings} ageGroup={props.ageGroup} change={change} />
        </>
      )}
      {general !== null && <Notice tone="error">{general}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Link
          to={props.cancelTo}
          className="inline-flex h-11 items-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
        >
          {t('form.cancel')}
        </Link>
        <Button type="submit" disabled={props.isRunning}>
          {props.submitLabel}
        </Button>
      </div>
    </form>
  );
}
