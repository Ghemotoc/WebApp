/**
 * ClassStoryMakePublic: "Make public" beside a writer's own story on a class's stories page
 * (bundle BOOKS-8; board G04-ClassStories, user story 8.4).
 *
 * Who shows it: ClassStoriesPage, only on rows whose writer is the person looking. Only the writer
 * can make a story public again: a teacher never can (S1-E8-11), and set_story_class() refuses
 * anyone else's story, so the button is a convenience, never the protection.
 * What it does: makes the story public with useSetStoryClass(slug).change(null); the story then
 * leaves the class's list, because every list is read again. A failure is said under the row.
 * What it calls: useSetStoryClass → set_story_class().
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useSetStoryClass } from '../hooks/useClassStories';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the button and, after a failure, what went wrong.
 *
 * @param props.storySlug - the writer's own story
 * @param props.storyTitle - its title, for the button's accessible name
 * @returns the button
 */
export function ClassStoryMakePublic({
  storySlug,
  storyTitle,
}: {
  storySlug: string;
  storyTitle: string;
}) {
  const { t } = useSpacesTranslation();
  const setClass = useSetStoryClass(storySlug);

  /** Makes the story public; the failure is shown from the hook's state. */
  async function makePublic() {
    await setClass.change(null).catch(() => null);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={setClass.isRunning}
        aria-label={t('classStories.makePublicLabel', { title: storyTitle })}
        onClick={makePublic}
      >
        {t('classStories.makePublic')}
      </Button>
      {setClass.failure !== null && (
        <div className="pt-2">
          <Notice tone="error">{t(`storyClass.failures.${setClass.failure.failure}`)}</Notice>
        </div>
      )}
    </>
  );
}
