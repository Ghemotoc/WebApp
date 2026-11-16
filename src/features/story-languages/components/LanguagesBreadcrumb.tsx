/**
 * LanguagesBreadcrumb: "Write / <story> / Languages" above the writer's Languages screens
 * (bundle TRANSLATE-1c; board TrSettings).
 *
 * Who shows it: StoryLanguagesPage and TranslateChaptersPage (which adds the language as the
 * last step). The last step is the page itself, so it is text with aria-current, not a link.
 */
import { Link } from 'react-router';

import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the breadcrumb needs. */
export interface LanguagesBreadcrumbProps {
  /** The original: its address and title, the middle step (to its settings). */
  story: { slug: string; title: string; languageCode: string };
  /** On a language's own page: that language's name, the last step after "Languages". */
  languageName?: string;
}

const linkClass = 'inline-flex min-h-11 items-center text-sm font-semibold break-words';

/**
 * Renders the breadcrumb.
 *
 * @returns the navigation
 */
export function LanguagesBreadcrumb({ story, languageName }: LanguagesBreadcrumbProps) {
  const { t } = useStoryLanguagesTranslation();
  const languagesStep =
    languageName === undefined ? (
      <span aria-current="page" className="text-sm text-body">
        {t('breadcrumb.languages')}
      </span>
    ) : (
      <Link to={`/write/s/${story.slug}/languages`} className={linkClass}>
        {t('breadcrumb.languages')}
      </Link>
    );
  return (
    <nav aria-label={t('breadcrumb.label')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 p-0 text-sm text-meta">
        <li>
          <Link to="/write" className={linkClass}>
            {t('breadcrumb.write')}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="min-w-0">
          <Link
            to={`/write/s/${story.slug}/settings`}
            lang={story.languageCode}
            className={linkClass}
          >
            {story.title}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>{languagesStep}</li>
        {languageName !== undefined && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page" className="text-sm text-body">
                {languageName}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
