/**
 * InitialsColourSection: "Circle colour" in Settings › Profile (bundle G11a; reshaped in CALM-3,
 * the simplified design, handover Step 4: "a member who keeps their initials gets a plain coloured
 * circle, its colour picked at random from the cover palette, and they can change it", Robert,
 * 20 Nov 2026, 12:12 UTC).
 *
 * Until someone saves a drawn avatar, their initials show on a plain coloured circle beside their
 * name. Here they pick the circle's colour from the seven in beadColours.ts: a 72 px preview, the
 * seven 32 px circles as a group of radio buttons (each inside a 44 px target and named for its
 * colour; arrow keys move between them, as for any radio group), and "Save colour". Every profile
 * has a colour (picked at random on joining), so the saved one is chosen to begin with.
 * "Build an avatar instead" jumps to the avatar builder just above.
 * Who shows it: SettingsGroupPanel (the Profile group), under AvatarBuilderSection.
 * What it calls: useAvatarLook and useSaveInitialsColour.
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { initialsOf } from '@/features/people/lib/formatting';

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
 * The 72 px preview: the chosen colour with the initials in Inter 600, as on a profile.
 * Decorative, because the chosen radio button already says which colour it is.
 *
 * @returns the preview circle
 */
function PreviewCircle({ initials, colour }: { initials: string; colour: BeadColourName }) {
  return (
    <span
      aria-hidden="true"
      style={beadStyleFor('', colour)}
      className="avatar-bead inline-flex size-[72px] flex-none items-center justify-center rounded-full font-body type-heading font-semibold"
    >
      <span className="avatar-bead-initials">{initials}</span>
    </span>
  );
}

/**
 * The seven colours as radio buttons: a plain 32 px circle each, inside a 44 px target, named for
 * its colour (the design system's swatches; the name is the radio's accessible name).
 *
 * @returns the group
 */
function ColourChoices({
  chosen,
  onChoose,
}: {
  chosen: BeadColourName;
  onChoose: (colour: BeadColourName) => void;
}) {
  const { t } = useAvatarsTranslation();
  const groupName = useId();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-3 p-0 type-meta font-semibold text-ink-heading">
        {t('initials.choicesLabel')}
      </legend>
      <div className="flex flex-wrap gap-1">
        {beadColours.map((bead) => (
          <label
            key={bead.name}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full"
          >
            <input
              type="radio"
              name={groupName}
              value={bead.name}
              aria-label={t(`initials.colours.${bead.name}`)}
              checked={bead.name === chosen}
              onChange={() => onChoose(bead.name)}
              className="peer sr-only"
            />
            {/* The chosen circle gets a 2 px ring in --primary with a gap of the card's colour
                (handover Step 4); the focus outline shows the one the keyboard is on. Every
                swatch has the covers' hairline edge (--cover-edge), so the pale lilac, blush and
                sky still show their shape on a pale card, and plum on the night page. */}
            <span
              aria-hidden="true"
              style={{ backgroundColor: bead.background }}
              className="block size-8 rounded-full border border-(--cover-edge) peer-checked:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--primary)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-(--focus-ring)"
            />
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
      <div role="status" className="min-h-5 type-body">
        {saving.isSaved && <span className="text-ink-muted">{t('initials.saved')}</span>}
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
  // The colour shown to begin with: the saved one (every profile has one since CALM-3; the
  // username's colour is only a fallback while the look is still loading).
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
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('initials.heading')}
      </h2>
      <p className="m-0 text-ink-muted">{t('initials.intro')}</p>
      {look.isError && <Notice tone="error">{t('builder.failures.unreachable')}</Notice>}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-none flex-col items-center gap-2">
          <PreviewCircle initials={initials} colour={chosen} />
          <span className="type-meta text-ink-muted">{t('initials.preview')}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ColourChoices
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
