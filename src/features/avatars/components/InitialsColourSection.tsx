/**
 * InitialsColourSection: "Initials colour" in Settings › Profile (bundle G11a; the canvas's
 * SettingsProfile board, "If you keep your initials").
 *
 * Until someone saves a drawn avatar, their initials show on a glass bead beside their name. Here
 * they pick the bead's colour from the sixteen in beadColours.ts: a large preview, the sixteen
 * beads as a group of radio buttons (arrow keys move between them, as for any radio group), and
 * "Save colour". With no colour saved, the colour from the username is chosen to begin with.
 * "Build an avatar instead" jumps to the avatar builder just above.
 * Who shows it: SettingsGroupPanel (the Profile group), under AvatarBuilderSection.
 * What it calls: useAvatarLook and useSaveInitialsColour.
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { initialsOf } from '@/features/people/lib/formatting';
import { cn } from '@/lib/utils';

import { useAvatarLook, useSaveInitialsColour } from '../hooks/useAvatarRecipe';
import { beadColourFor, beadColours, beadStyleFor, type BeadColourName } from '../lib/beadColours';
import { useAvatarsTranslation } from '../registerAvatarTranslations';

/** What the section needs. */
export interface InitialsColourSectionProps {
  /** The signed-in person's username, without "@". */
  handle: string;
  /** The pen name or username the initials come from. */
  name: string;
}

/**
 * One round bead with the initials, decorative (the colour's name is written beside it).
 *
 * @returns the bead
 */
function Bead({
  initials,
  colour,
  large = false,
}: {
  initials: string;
  colour: BeadColourName;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      style={beadStyleFor('', colour)}
      className={cn(
        'avatar-bead inline-flex flex-none items-center justify-center rounded-full font-heading font-extrabold',
        large ? 'size-[120px] text-[44px]' : 'size-12 text-[17px]',
      )}
    >
      <span className="avatar-bead-initials">{initials}</span>
    </span>
  );
}

/**
 * The sixteen colours as radio buttons, each a bead with its name under it.
 *
 * @returns the group
 */
function ColourChoices({
  initials,
  chosen,
  onChoose,
}: {
  initials: string;
  chosen: BeadColourName;
  onChoose: (colour: BeadColourName) => void;
}) {
  const { t } = useAvatarsTranslation();
  const groupName = useId();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-3 p-0 text-[13px] font-semibold text-heading">
        {t('initials.choicesLabel')}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-3.5">
        {beadColours.map((bead) => (
          <label
            key={bead.name}
            className="flex w-[64px] cursor-pointer flex-col items-center gap-1.5 text-center text-[13px] text-body"
          >
            <input
              type="radio"
              name={groupName}
              value={bead.name}
              checked={bead.name === chosen}
              onChange={() => onChoose(bead.name)}
              className="peer sr-only"
            />
            {/* The ring shows the chosen bead, and the focus ring the one the keyboard is on. */}
            <span className="rounded-full p-[3px] ring-2 ring-transparent peer-checked:ring-(--link) peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)">
              <Bead initials={initials} colour={bead.name} />
            </span>
            <span className="peer-checked:font-bold">{t(`initials.colours.${bead.name}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Brings the avatar builder above into view and puts the keyboard there. */
function goToAvatarBuilder() {
  const builderHeading = document.getElementById('settings-avatar-heading');
  builderHeading?.scrollIntoView({ block: 'start' });
  builderHeading?.closest('section')?.querySelector<HTMLElement>('button, [tabindex]')?.focus();
}

/**
 * Save colour, Build an avatar instead, and the line that says how the save went.
 *
 * @returns the row and its status line
 */
function SaveRow({
  saving,
  isLoading,
  onSave,
}: {
  saving: ReturnType<typeof useSaveInitialsColour>;
  isLoading: boolean;
  onSave: () => void;
}) {
  const { t } = useAvatarsTranslation();
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* A refused save shows in the status line below, so the rejection needs no handler. */}
        <Button disabled={saving.isSaving || isLoading} onClick={onSave}>
          {t('initials.save')}
        </Button>
        <Button variant="secondary" onClick={goToAvatarBuilder}>
          {t('initials.buildAvatar')}
        </Button>
      </div>
      <div role="status" className="min-h-5 text-sm">
        {saving.isSaved && <span className="text-body">{t('initials.saved')}</span>}
        {saving.failure !== null && (
          <span className="text-destructive">{t(`builder.failures.${saving.failure}`)}</span>
        )}
      </div>
    </>
  );
}

/**
 * Renders the section once the saved look has loaded.
 *
 * @returns the section
 */
export function InitialsColourSection({ handle, name }: InitialsColourSectionProps) {
  const { t } = useAvatarsTranslation();
  const look = useAvatarLook(handle);
  const saving = useSaveInitialsColour(handle);
  // The colour shown to begin with: the saved one, or the one the username gives.
  const savedColour = beadColourFor(handle, look.data?.initialsColour ?? null).name;
  const [picked, setPicked] = useState<BeadColourName | null>(null);
  const chosen = picked ?? savedColour;
  const initials = initialsOf(name);
  return (
    <section
      id="initials-colour"
      aria-labelledby="initials-colour-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="initials-colour-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('initials.heading')}
      </h2>
      <p className="m-0 text-body">{t('initials.intro')}</p>
      {look.isError && <Notice tone="error">{t('builder.failures.unreachable')}</Notice>}
      <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center">
        <div className="flex flex-none flex-col items-center gap-2">
          <Bead initials={initials} colour={chosen} large />
          <span className="text-[13px] text-meta">{t('initials.preview')}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ColourChoices
            initials={initials}
            chosen={chosen}
            onChoose={(colour) => {
              setPicked(colour);
              saving.reset();
            }}
          />
          <SaveRow
            saving={saving}
            isLoading={look.isPending}
            onSave={() => void saving.save(chosen).catch(() => undefined)}
          />
        </div>
      </div>
    </section>
  );
}
