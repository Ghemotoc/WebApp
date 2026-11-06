/**
 * StoryClassCard: "Who can read it" in Story settings, where a student shares a story only with
 * their class or makes it public again (bundle CLASSES, part c; story S1-E8-11: the writer, never
 * the teacher, decides when a class story becomes public).
 *
 * What it shows: nothing for a writer in no class whose story is public. Otherwise, while public,
 * a drop-down of their classes and "Share only with this class"; while shared, which class reads
 * it and "Make it public". The change saves at once, apart from the form's Save button, so both
 * buttons are type="button" (the card sits inside the settings form).
 * Who shows it: StorySettingsPage, after the rank badges.
 * What it calls: useStoryClassShare() → story_class_share(), useSetStoryClass() →
 * set_story_class().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { FormSection } from '@/features/writing/components/FormSection';

import type { StoryClassShare } from '../api/classStories';
import { useSetStoryClass, useStoryClassShare } from '../hooks/useClassStories';
import { useSpacesTranslation } from '../registerSpacesTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The outcome of the last change, under the buttons. */
function ChangeNotice({ change }: { change: ReturnType<typeof useSetStoryClass> }) {
  const { t } = useSpacesTranslation();
  if (change.failure !== null) {
    return <Notice tone="error">{t(`storyClass.failures.${change.failure.failure}`)}</Notice>;
  }
  if (change.isDone) return <Notice tone="success">{t('storyClass.saved')}</Notice>;
  return null;
}

/** While shared: which class reads it, and "Make it public". */
function SharedState(props: {
  share: StoryClassShare;
  change: ReturnType<typeof useSetStoryClass>;
}) {
  const { share, change } = props;
  const { t } = useSpacesTranslation();
  // The class may have been deleted: the story then stays private to the writer, never public.
  const text =
    share.sharedWith === null
      ? t('storyClass.sharedWithDeleted')
      : t('storyClass.sharedWith', { name: share.sharedWith.name });
  return (
    <>
      <p className="m-0 text-sm text-body">{text}</p>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={change.isRunning}
          onClick={() => void change.change(null).catch(errorShownByHook)}
        >
          {t('storyClass.makePublic')}
        </Button>
      </div>
    </>
  );
}

/** While public: the writer's classes and "Share only with this class". */
function PublicState(props: {
  share: StoryClassShare;
  change: ReturnType<typeof useSetStoryClass>;
}) {
  const { share, change } = props;
  const { t } = useSpacesTranslation();
  const [classSlug, setClassSlug] = useState(share.choices[0]?.slug ?? '');
  return (
    <>
      <p className="m-0 text-sm text-body">{t('storyClass.publicNow')}</p>
      <Select
        id="story-class"
        label={t('storyClass.pick')}
        isLabelVisible
        options={share.choices.map((choice) => ({ value: choice.slug, label: choice.name }))}
        value={classSlug}
        onChange={setClassSlug}
      />
      <div>
        <Button
          type="button"
          disabled={change.isRunning || classSlug === ''}
          onClick={() => void change.change(classSlug).catch(errorShownByHook)}
        >
          {t('storyClass.share')}
        </Button>
      </div>
    </>
  );
}

/**
 * Renders the card, or nothing when the writer has no class to share with.
 *
 * @param props.slug - the writer's story
 * @returns the section card
 */
export function StoryClassCard({ slug }: { slug: string }) {
  const { t } = useSpacesTranslation();
  const read = useStoryClassShare(slug);
  const change = useSetStoryClass(slug);
  const share = read.data ?? null;
  if (share === null) return null;
  if (!share.isClassOnly && share.choices.length === 0) return null;
  return (
    <FormSection legend={t('storyClass.legend')}>
      <p className="m-0 max-w-[640px] text-sm leading-normal text-body">{t('storyClass.intro')}</p>
      {share.isClassOnly ? (
        <SharedState share={share} change={change} />
      ) : (
        <PublicState share={share} change={change} />
      )}
      <ChangeNotice change={change} />
    </FormSection>
  );
}
