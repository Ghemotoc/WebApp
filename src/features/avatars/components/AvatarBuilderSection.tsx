/**
 * AvatarBuilderSection: "Your avatar" in Settings › Profile (bundle ADMIN-2, part g; Robert's
 * brief of 2 Nov 2026, section 7). Replaces the profile picture upload of S1-E10-05: avatars are
 * built or initials only, so nothing is uploaded and nothing needs checking.
 *
 * A big live preview, then the editor's tabs of picture tiles and colour swatches (bundle
 * AVATAR-1, 6 Nov 2026: no drop-downs), Surprise me, Undo, Save and "Use my initials", and the
 * art's credit (CC BY 4.0 asks for it). The initials stay the default until the person saves an
 * avatar.
 * Who shows it: SettingsPage, once the person has a username. What it calls: useAvatarRecipe,
 * useSaveAvatarRecipe, useAvatarDraft, AvatarDrawing, AvatarEditorTabs, AvatarBuilderActions.
 */
import { useState } from 'react';
import { useAvatarsTranslation } from '../registerAvatarTranslations';

import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { useAvatarDraft } from '../hooks/useAvatarDraft';
import { useAvatarRecipe, useSaveAvatarRecipe } from '../hooks/useAvatarRecipe';
import { startingRecipe } from '../lib/avatarOptions';

import { AvatarArtCredit } from './AvatarArtCredit';
import { AvatarBuilderActions } from './AvatarBuilderActions';
import { AvatarDrawing } from './AvatarDrawing';
import { AvatarEditorTabs } from './AvatarEditorTabs';

/**
 * The builder itself, once the saved recipe is known.
 *
 * @returns the preview, the editor and the buttons
 */
function AvatarBuilder({ handle, saved }: { handle: string; saved: AvatarRecipe | null }) {
  const { t } = useAvatarsTranslation();
  const draft = useAvatarDraft(saved ?? startingRecipe);
  const saving = useSaveAvatarRecipe(handle);
  const [outcome, setOutcome] = useState<'saved' | 'initials' | null>(null);

  /** Saves the draft, or (null) goes back to the initials; a refusal shows its message. */
  async function save(recipe: AvatarRecipe | null) {
    setOutcome(null);
    const isDone = await saving.save(recipe).then(
      () => true,
      () => false,
    );
    if (isDone) setOutcome(recipe === null ? 'initials' : 'saved');
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {/* Step 1: the big preview; it stays in view beside the tabs on a wide screen. */}
      <div className="flex flex-col items-center gap-2 md:sticky md:top-6">
        <span className="relative inline-flex size-40 flex-none rounded-full border border-border bg-panel">
          <AvatarDrawing recipe={draft.draft} alt={t('builder.previewAlt')} className="size-full" />
        </span>
        <p className="m-0 text-sm text-meta">
          {saved === null ? t('builder.showingInitials') : t('builder.showingAvatar')}
        </p>
      </div>
      {/* Step 2: the tabs of tiles and swatches, the buttons and the art's credit. */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <AvatarEditorTabs draft={draft.draft} onChoose={draft.choose} />
        <AvatarBuilderActions
          canUndo={draft.canUndo}
          hasSavedAvatar={saved !== null}
          isSaving={saving.isSaving}
          outcome={outcome}
          failure={saving.failure}
          onSurprise={draft.surprise}
          onUndo={draft.undo}
          onSave={() => void save(draft.draft)}
          onUseInitials={() => void save(null)}
        />
        <AvatarArtCredit />
      </div>
    </div>
  );
}

/**
 * Renders the section.
 *
 * @param props.handle - the signed-in person's username
 * @returns the section
 */
export function AvatarBuilderSection({ handle }: { handle: string }) {
  const { t } = useAvatarsTranslation();
  const saved = useAvatarRecipe(handle);
  return (
    <section
      aria-labelledby="settings-avatar-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-avatar-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('builder.heading')}
      </h2>
      <p className="m-0 text-body">{t('builder.intro')}</p>
      {saved.isError && <p className="m-0 text-body">{t('builder.failures.unreachable')}</p>}
      {saved.isSuccess && <AvatarBuilder handle={handle} saved={saved.data} />}
    </section>
  );
}
