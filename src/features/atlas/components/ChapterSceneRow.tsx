/**
 * ChapterSceneRow: one scene of a chapter (story S1-E17-25: "a title, POV, status and summary";
 * "reorder (with buttons) or delete a scene … deleting needs a second click").
 *
 * Who uses it: ChapterScenesSection. What it calls: the changers it is given.
 */
import { Button } from '@/components/ui/Button';

import { planningStatuses, type ChapterPlan, type ChapterScene } from '../api/chapterPlans';
import type { ChapterSceneChange } from '../api/chapterPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';
import { TwoStepDelete } from './TwoStepDelete';

/** What the row needs. */
export interface ChapterSceneRowProps {
  scene: ChapterScene;
  plan: ChapterPlan;
  isFirst: boolean;
  isLast: boolean;
  save: (change: ChapterSceneChange) => Promise<void>;
  /** Moves this scene to a place (from 1). */
  moveTo: (position: number) => void;
  remove: () => Promise<void>;
}

/** Earlier and Later, each disabled at its end. */
function SceneMoveButtons({
  scene,
  isFirst,
  isLast,
  moveTo,
}: Pick<ChapterSceneRowProps, 'scene' | 'isFirst' | 'isLast' | 'moveTo'>) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        disabled={isFirst}
        aria-label={t('chapterPlan.scenes.moveUp', { title: scene.title })}
        onClick={() => moveTo(scene.position - 1)}
      >
        {t('chapterPlan.scenes.up')}
      </Button>
      <Button
        variant="secondary"
        disabled={isLast}
        aria-label={t('chapterPlan.scenes.moveDown', { title: scene.title })}
        onClick={() => moveTo(scene.position + 1)}
      >
        {t('chapterPlan.scenes.down')}
      </Button>
    </div>
  );
}

/** The scene's point of view and status, each saving when picked. */
function SceneMetaPickers({
  idBase,
  scene,
  plan,
  save,
}: Pick<ChapterSceneRowProps, 'scene' | 'plan' | 'save'> & { idBase: string }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <PlanSelectField
        id={`${idBase}-pov`}
        label={t('chapterPlan.pov')}
        options={[
          { value: '', label: t('chapterPlan.none') },
          ...plan.characters.map((character) => ({ value: character.id, label: character.name })),
        ]}
        savedValue={scene.povCharacterId ?? ''}
        save={async (value) => save({ pov_character_id: value })}
      />
      <PlanSelectField
        id={`${idBase}-status`}
        label={t('chapterPlan.status')}
        options={planningStatuses.map((status) => ({
          value: status,
          label: t(`chapterPlan.statuses.${status}`),
        }))}
        savedValue={scene.status}
        save={async (value) => save({ status: value as ChapterSceneChange['status'] })}
      />
    </div>
  );
}

/**
 * Renders the scene.
 *
 * @returns the list item with its fields, move buttons and Delete
 */
export function ChapterSceneRow(props: ChapterSceneRowProps) {
  const { t } = useAtlasTranslation();
  const { scene, plan, save } = props;
  const idBase = `atlas-scene-${scene.id}`;
  return (
    <li
      data-testid="atlas-scene-row"
      className="flex flex-col gap-2 border-b border-hairline py-4 last:border-b-0"
    >
      <PlanTextField
        id={`${idBase}-title`}
        label={t('chapterPlan.scenes.title', { number: scene.position })}
        savedValue={scene.title}
        isValid={(value) => value.trim() !== ''}
        invalidMessage={t('chapterPlan.scenes.titleRequired')}
        maxLength={200}
        save={async (value) => save({ title: value })}
      />
      <SceneMetaPickers idBase={idBase} scene={scene} plan={plan} save={save} />
      <PlanTextField
        id={`${idBase}-summary`}
        label={t('chapterPlan.summary')}
        savedValue={scene.summary}
        isMultiline
        maxLength={5000}
        save={async (value) => save({ summary: value })}
      />
      <div className="flex flex-wrap items-start gap-3">
        <SceneMoveButtons {...props} />
        <TwoStepDelete
          buttonLabel={t('chapterPlan.scenes.delete')}
          buttonAccessibleName={t('chapterPlan.scenes.deleteNamed', { title: scene.title })}
          question={t('chapterPlan.scenes.confirm', { title: scene.title })}
          yesLabel={t('chapterPlan.scenes.yes')}
          keepLabel={t('chapterPlan.scenes.keep')}
          failedMessage={t('chapterPlan.scenes.deleteFailed')}
          onDelete={async () => {
            await props.remove();
            return null;
          }}
        />
      </div>
    </li>
  );
}
