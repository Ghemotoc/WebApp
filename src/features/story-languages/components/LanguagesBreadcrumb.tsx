/**
 * LanguagesBreadcrumb: "Writing / <story> / Languages" above the writer's Languages screens
 * (bundle TRANSLATE-1c), drawn as board D08's breadcrumb (CALM-9, user story 5.8).
 *
 * Who shows it: StoryLanguagesPage and TranslateChaptersPage (which adds the language as the
 * last step). The last step is the page itself, so it is text with aria-current, not a link.
 * What it calls: the writing feature's WritingBreadcrumb, so every Write page has one look.
 */
import { useTranslation } from 'react-i18next';

import {
  WritingBreadcrumb,
  type WritingCrumb,
} from '@/features/writing/components/WritingBreadcrumb';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the breadcrumb needs. */
export interface LanguagesBreadcrumbProps {
  /** The original: its address and title, the middle step (to its settings). */
  story: { slug: string; title: string; languageCode: string };
  /** On a language's own page: that language's name, the last step after "Languages". */
  languageName?: string;
}

/**
 * Renders the breadcrumb.
 *
 * @returns the navigation
 */
export function LanguagesBreadcrumb({ story, languageName }: LanguagesBreadcrumbProps) {
  const { t } = useStoryLanguagesTranslation();
  const { t: writingT } = useTranslation('writing');
  const languagesAddress = `/write/s/${story.slug}/languages`;
  // Writing, then the story (to its settings), then Languages: a link only on a language's page.
  const crumbs: WritingCrumb[] = [
    { label: writingT('breadcrumb.writing'), to: '/write' },
    { label: story.title, to: `/write/s/${story.slug}/settings`, lang: story.languageCode },
    {
      label: t('breadcrumb.languages'),
      to: languageName === undefined ? undefined : languagesAddress,
    },
  ];
  if (languageName !== undefined) crumbs.push({ label: languageName });
  return <WritingBreadcrumb crumbs={crumbs} />;
}
