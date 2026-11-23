/**
 * LoadProblem: the plain message a writer's Languages screen shows instead of its content:
 * signed out, the database couldn't be reached, or the story (or chapter) isn't the writer's
 * (bundle TRANSLATE-1c).
 *
 * Who shows it: StoryLanguagesPage, TranslateChaptersPage and TranslationEditorPage.
 */
import { Notice } from '@/components/ui/Notice';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the message needs to know about the load. */
export interface LoadProblemProps {
  /** False while the session or the content is still loading: nothing shows yet. */
  isKnown: boolean;
  isSignedIn: boolean;
  loadFailed: boolean;
  /** True when the load finished and found nothing. */
  isMissing: boolean;
  /** Which words to use: a story's or a chapter's. */
  kind: 'story' | 'chapter';
}

/**
 * Renders the message.
 *
 * @returns the message, or nothing while loading or when the content is there
 */
export function LoadProblem({
  isKnown,
  isSignedIn,
  loadFailed,
  isMissing,
  kind,
}: LoadProblemProps) {
  const { t } = useStoryLanguagesTranslation();
  if (!isKnown) return null;
  if (!isSignedIn) return <p className="m-0 text-ink-muted">{t('page.signedOut')}</p>;
  if (loadFailed) {
    return (
      <Notice tone="error">{t(kind === 'story' ? 'page.loadFailed' : 'editor.loadFailed')}</Notice>
    );
  }
  if (isMissing) {
    return (
      <Notice tone="error">{t(kind === 'story' ? 'page.notFound' : 'editor.notFound')}</Notice>
    );
  }
  return null;
}
