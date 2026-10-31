/**
 * ChapterScenesSection: "Scenes" on a chapter's plan (story S1-E17-25: "break a chapter into
 * scenes, so that I can plan beats in more detail").
 *
 * The scenes in order, each a ChapterSceneRow, then "Add a scene". A failed move or add says so
 * plainly. Who uses it: ChapterPlanPanel. What it calls: useChapterPlan's scene changers, passed in.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { ChapterPlan, ChapterSceneChange } from '../api/chapterPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { ChapterSceneRow } from './ChapterSceneRow';

/** What the section needs. */
export interface ChapterScenesSectionProps {
  plan: ChapterPlan;
  addScene: (title: string) => Promise<void>;
  saveScene: (sceneId: string, change: ChapterSceneChange) => Promise<void>;
  moveScene: (sceneId: string, newPosition: number) => Promise<void>;
  removeScene: (sceneId: string) => Promise<void>;
}

/** "Add a scene": a title and the button, with a plain message when it can't. */
function AddSceneForm({ addScene }: Pick<ChapterScenesSectionProps, 'addScene'>) {
  const { t } = useAtlasTranslation();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  /** Adds the typed scene, or says why not. */
  async function add() {
    setMessage(null);
    if (title.trim() === '') return setMessage(t('chapterPlan.scenes.titleRequired'));
    await addScene(title)
      .then(() => setTitle(''))
      .catch(() => setMessage(t('chapterPlan.scenes.addFailed')));
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <div className="min-w-0 flex-1 basis-40">
        <TextInput
          id="atlas-new-scene"
          label={t('chapterPlan.scenes.newTitle')}
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary">
        {t('chapterPlan.scenes.add')}
      </Button>
      <div aria-live="polite" className="w-full">
        {message !== null && <Notice tone="error">{message}</Notice>}
      </div>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading, the scenes and the add form
 */
export function ChapterScenesSection(props: ChapterScenesSectionProps) {
  const { t } = useAtlasTranslation();
  const { plan } = props;
  const [moveFailed, setMoveFailed] = useState(false);

  /** Moves a scene, or says plainly that it couldn't. */
  function move(sceneId: string, position: number) {
    setMoveFailed(false);
    void props.moveScene(sceneId, position).catch(() => setMoveFailed(true));
  }

  return (
    <section aria-labelledby="atlas-scenes-heading" className="flex flex-col gap-2">
      <h3 id="atlas-scenes-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('chapterPlan.scenes.heading')}
      </h3>
      {plan.scenes.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('chapterPlan.scenes.none')}</p>
      )}
      <div aria-live="polite">
        {moveFailed && <Notice tone="error">{t('chapterPlan.scenes.moveFailed')}</Notice>}
      </div>
      <ol className="m-0 list-none p-0">
        {plan.scenes.map((scene, index) => (
          <ChapterSceneRow
            key={scene.id}
            scene={scene}
            plan={plan}
            isFirst={index === 0}
            isLast={index === plan.scenes.length - 1}
            save={async (change) => props.saveScene(scene.id, change)}
            moveTo={(position) => move(scene.id, position)}
            remove={async () => props.removeScene(scene.id)}
          />
        ))}
      </ol>
      <AddSceneForm addScene={props.addScene} />
    </section>
  );
}
