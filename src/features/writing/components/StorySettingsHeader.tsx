/**
 * StorySettingsHeader: the top of Story settings as board D07 draws it (BOOKS D07, user story
 * 5.7): "Writing / <the story>" as a breadcrumb, "Story settings" as the heading, the story's
 * title with "Readers see the changes as soon as you save." under it, and then a row with
 * Manage chapters and Languages as quiet buttons and "See story page" as a text button.
 *
 * Who shows it: StorySettingsPage. What it calls: WritingBreadcrumb; the links lead to the
 * story's chapters, its languages and its public page.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import type { MyStory } from '../api/stories';

import { WritingBreadcrumb, type WritingCrumb } from './WritingBreadcrumb';

/** The three links under the heading: two quiet buttons, then a text button (board D07). */
function SettingsLinks({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  const quiet = buttonClassName({ variant: 'secondary', size: 'md' });
  const text = buttonClassName({ variant: 'text', size: 'md' });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link to={`/write/s/${story.slug}/chapters`} className={quiet}>
        {t('storyCard.manageChapters')}
      </Link>
      {/* One story in several languages (TRANSLATE-1c): the languages and their translations. */}
      <Link to={`/write/s/${story.slug}/languages`} className={quiet}>
        {t('storyCard.languages')}
      </Link>
      <Link to={`/s/${story.slug}`} className={text}>
        {t('storyCard.seePage')}
      </Link>
    </div>
  );
}

/**
 * Renders the header.
 *
 * @param props.story - the story, or undefined while it loads or when it isn't found
 * @returns the breadcrumb, the heading, the line under it and the links
 */
export function StorySettingsHeader({ story }: { story: MyStory | undefined }) {
  const { t } = useTranslation('writing');
  // The breadcrumb ends at the story itself; until it loads, it ends at Writing.
  const crumbs: WritingCrumb[] = [{ label: t('breadcrumb.writing'), to: '/write' }];
  if (story !== undefined) crumbs.push({ label: story.title });
  return (
    <div className="flex flex-col gap-3">
      <WritingBreadcrumb crumbs={crumbs} />
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 type-title lg:type-display">{t('settings.heading')}</h1>
          {story !== undefined && (
            <p className="m-0 type-body text-ink-muted">
              {t('settings.intro', { title: story.title })}
            </p>
          )}
        </div>
        {story !== undefined && <SettingsLinks story={story} />}
      </header>
    </div>
  );
}
