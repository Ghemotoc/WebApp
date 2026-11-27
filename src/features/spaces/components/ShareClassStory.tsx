/**
 * ShareClassStory: "Share a story" on a class page (bundle BOOKS-8; boards G03-Class and
 * G04-ClassStories, user stories 8.3 and 8.4).
 *
 * Who shows it: ClassSpaceHeader and ClassStoriesPage, to a member who may post in the class.
 * What it does: the main button opens a short form under it: a drop-down of the writer's own
 * stories not yet shared with this class, and "Share only with this class". The story then reads
 * Class only: classmates can read it, nobody else can, until the writer makes it public in Story
 * settings (S1-E8-11: the writer, never the teacher, decides). A writer with no story yet is sent
 * to Write.
 * What it calls: useMyStories → the writer's stories; useShareStoryWithClass → set_story_class().
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { useMyStories } from '@/features/writing/hooks/useMyStories';

import { useClassSpaceStories, useShareStoryWithClass } from '../hooks/useClassStories';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * The writer's stories that could still be shared with this class.
 *
 * @param classSlug - the class's address
 * @returns the choices (slug and title) and whether both lists have loaded
 */
function useShareChoices(classSlug: string) {
  const mine = useMyStories();
  const shared = useClassSpaceStories(classSlug);
  // A story already in the class's list needs no second share.
  const sharedSlugs = new Set((shared.data ?? []).map((story) => story.slug));
  const choices = mine.stories
    .filter((story) => !sharedSlugs.has(story.slug))
    .map((story) => ({ value: story.slug, label: story.title }));
  return { choices, isKnown: mine.isKnown && shared.isSuccess };
}

/**
 * The form under the button: pick a story, then share it.
 *
 * @param props.classSlug - the class's address
 * @param props.onDone - closes the form
 * @returns the drop-down and the buttons, or the way to Write when there is no story to share
 */
function ShareForm({ classSlug, onDone }: { classSlug: string; onDone: () => void }) {
  const { t } = useSpacesTranslation();
  const { choices, isKnown } = useShareChoices(classSlug);
  const sharing = useShareStoryWithClass(classSlug);
  const [picked, setPicked] = useState('');
  const storySlug = picked === '' ? (choices[0]?.value ?? '') : picked;
  if (!isKnown) return null;
  if (choices.length === 0) {
    return (
      <p className="m-0 type-body text-ink-muted">
        {t('classPage.shareNone')}{' '}
        <Link to="/write" className="font-semibold text-link underline">
          {t('classPage.shareWrite')}
        </Link>
      </p>
    );
  }
  /** Shares the picked story; the form closes once it worked and stays open to show a failure. */
  async function share() {
    const shared = await sharing.share(storySlug).then(
      () => true,
      () => false,
    );
    if (shared) onDone();
  }
  return (
    <div className="flex flex-col gap-3">
      <Select
        id="class-share-story"
        label={t('classPage.shareLabel')}
        isLabelAbove
        options={choices}
        value={storySlug}
        onChange={setPicked}
      />
      <p className="m-0 type-body text-ink-muted">{t('classPage.shareNote')}</p>
      <ButtonRow>
        <Button type="button" disabled={sharing.isRunning} onClick={() => void share()}>
          {t('classPage.shareConfirm')}
        </Button>
        <Button type="button" variant="text" onClick={onDone}>
          {t('classPage.shareCancel')}
        </Button>
      </ButtonRow>
      <div aria-live="polite">
        {sharing.failure !== null && (
          <Notice tone="error">{t(`storyClass.failures.${sharing.failure.failure}`)}</Notice>
        )}
      </div>
    </div>
  );
}

/**
 * Renders the button and, once pressed, the form.
 *
 * @param props.classSlug - the class's address
 * @returns "Share a story" and its form
 */
export function ShareClassStory({ classSlug }: { classSlug: string }) {
  const { t } = useSpacesTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <ButtonRow>
        <Button
          type="button"
          aria-expanded={isOpen}
          aria-controls="class-share-form"
          onClick={() => setIsOpen(!isOpen)}
        >
          {t('classPage.share')}
        </Button>
      </ButtonRow>
      <div id="class-share-form">
        {isOpen && <ShareForm classSlug={classSlug} onDone={() => setIsOpen(false)} />}
      </div>
    </div>
  );
}
