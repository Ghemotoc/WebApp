/**
 * AvatarBuilderActions: Surprise me, Undo, Save and "Use my initials", with what happened in
 * plain words (bundle ADMIN-2, part g).
 *
 * Who shows it: AvatarBuilderSection. What it calls: the handlers it is given.
 */
import { useAvatarsTranslation } from '../registerAvatarTranslations';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { AvatarSaveFailure } from '../api/avatarRecipe';

/** What the buttons need. */
export interface AvatarBuilderActionsProps {
  canUndo: boolean;
  hasSavedAvatar: boolean;
  isSaving: boolean;
  /** What the last save did: 'saved', 'initials', or null before any. */
  outcome: 'saved' | 'initials' | null;
  failure: AvatarSaveFailure | null;
  onSurprise: () => void;
  onUndo: () => void;
  onSave: () => void;
  onUseInitials: () => void;
}

/**
 * Renders the buttons and the message.
 *
 * @returns the actions
 */
export function AvatarBuilderActions(props: AvatarBuilderActionsProps) {
  const { t } = useAvatarsTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={props.onSurprise}>
          {t('builder.surprise')}
        </Button>
        <Button variant="secondary" disabled={!props.canUndo} onClick={props.onUndo}>
          {t('builder.undo')}
        </Button>
        <Button disabled={props.isSaving} onClick={props.onSave}>
          {t('builder.save')}
        </Button>
        {props.hasSavedAvatar && (
          <Button variant="secondary" disabled={props.isSaving} onClick={props.onUseInitials}>
            {t('builder.useInitials')}
          </Button>
        )}
      </div>
      {/* Said politely to screen readers once a save finishes. */}
      <div aria-live="polite">
        {props.failure === null && props.outcome !== null && (
          <Notice tone="success">{t(`builder.outcomes.${props.outcome}`)}</Notice>
        )}
        {props.failure !== null && (
          <Notice tone="error">{t(`builder.failures.${props.failure}`)}</Notice>
        )}
      </div>
    </div>
  );
}
