/**
 * LearningPathPage: one day of the learning path at /hub/path?day=N (bundle GAPS-12g; board
 * WritersHub, "Learning path · Your first chapter in 7 days").
 *
 * The day's short lesson and its small task, "Mark day N done" (or taking the tick off), a link
 * on to the next day, and the seven days beside it. Without a day in the address it opens the
 * first day not yet done. Signed out, it says to log in, as the hub does.
 * Who shows it: the router, at /hub/path; HubPath and PathStepList link here.
 * What it calls: useLearningPath, PathStepList, useSession.
 */
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';

import type { LearningStep } from '../api/hubPath';
import { useLearningPath, type LearningPathState } from '../hooks/useLearningPath';
import { dayFromAddress, lessonParagraphs, nextOpenDay } from '../lib/learningPath';
import { useHubTranslation } from '../registerHubTranslations';

import { PathStepList } from './PathStepList';

/**
 * The buttons under a day: tick it or untick it, and on to the next day or to writing.
 *
 * @param props.step - the open day
 * @param props.path - the path's state, for ticking
 * @returns the row of controls
 */
function DayActions({ step, path }: { step: LearningStep; path: LearningPathState }) {
  const { t } = useHubTranslation();
  const isLastDay = step.day === path.steps.length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {step.isDone ? (
        <Button
          variant="secondary"
          disabled={path.isMarking}
          onClick={() => path.mark(step.day, false)}
        >
          {t('path.markNotDone')}
        </Button>
      ) : (
        <Button disabled={path.isMarking} onClick={() => path.mark(step.day, true)}>
          {t('path.markDone', { day: step.day })}
        </Button>
      )}
      {isLastDay ? (
        <Link to="/write" className="text-sm font-semibold text-link underline">
          {t('path.goWrite')}
        </Link>
      ) : (
        <Link
          to={`/hub/path?day=${step.day + 1}`}
          className="text-sm font-semibold text-link underline"
        >
          {t('path.nextDay', { day: step.day + 1 })}
        </Link>
      )}
    </div>
  );
}

/**
 * One day: its number and title, the lesson's paragraphs, the task and the controls.
 *
 * @param props.step - the open day
 * @param props.path - the path's state
 * @returns the article
 */
function DayLesson({ step, path }: { step: LearningStep; path: LearningPathState }) {
  const { t, i18n } = useHubTranslation();
  // The day's words in the interface language.
  const isRomanian = i18n.language === 'ro';
  const lesson = isRomanian ? step.lessonRo : step.lessonEn;
  return (
    <article
      aria-labelledby="path-day"
      className="flex min-w-0 flex-[999_1_480px] flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <p className="eyebrow m-0">
          {t('path.dayOf', { day: step.day, total: path.steps.length })}
          {step.isDone && ` · ${t('hub.path.done')}`}
        </p>
        <h2
          id="path-day"
          className="m-0 font-heading text-[28px] leading-tight font-bold wrap-anywhere text-heading"
        >
          {isRomanian ? step.titleRo : step.titleEn}
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {lessonParagraphs(lesson).map((paragraph) => (
          <p key={paragraph} className="m-0 text-[17px] leading-relaxed wrap-anywhere text-body">
            {paragraph}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 rounded-card border border-border bg-tint p-4">
        <h3 className="eyebrow m-0">{t('path.task')}</h3>
        <p className="m-0 font-semibold wrap-anywhere text-heading">
          {isRomanian ? step.taskRo : step.taskEn}
        </p>
      </div>
      <div aria-live="polite">
        {path.markFailed && <Notice tone="error">{t('path.markFailed')}</Notice>}
      </div>
      <DayActions step={step} path={path} />
    </article>
  );
}

/**
 * The page for someone signed in: the open day and the seven days beside it.
 *
 * @returns the two columns, a wait or a plain message
 */
function PathBody() {
  const { t } = useHubTranslation();
  const path = useLearningPath();
  const [searchParams] = useSearchParams();
  if (path.loadFailed) return <Notice tone="error">{t('hub.path.loadFailed')}</Notice>;
  if (!path.isLoaded) return <p className="m-0 text-meta">{t('path.loading')}</p>;
  // The day the address asks for; without one, the first day still open (day 1 when all done).
  const wantedDay =
    dayFromAddress(searchParams.get('day'), path.steps.length) ?? nextOpenDay(path.steps) ?? 1;
  const step = path.steps.find((candidate) => candidate.day === wantedDay);
  if (step === undefined) return <Notice tone="error">{t('hub.path.loadFailed')}</Notice>;
  return (
    <div className="flex flex-wrap items-start gap-7">
      <DayLesson step={step} path={path} />
      <nav
        aria-label={t('path.daysLabel')}
        className="flex min-w-0 flex-[1_1_280px] flex-col rounded-card border border-border bg-surface p-5 shadow-card"
      >
        <PathStepList steps={path.steps} currentDay={step.day} />
      </nav>
    </div>
  );
}

/**
 * Renders the page: the path when signed in, a log-in line when not.
 *
 * @returns the page
 */
export function LearningPathPage() {
  const { t } = useHubTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer className="flex flex-col gap-7 pt-10 pb-16">
      <title>{t('path.documentTitle', { productName: brand.productName })}</title>
      <header className="flex flex-col gap-2">
        <Link to="/hub" className="self-start text-sm font-semibold text-link underline">
          {t('path.backToHub')}
        </Link>
        <h1 className="page-title">{t('hub.path.heading')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('hub.path.intro')}</p>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 text-body">
          {t('path.signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('hub.logIn')}
          </Link>
        </p>
      )}
      {userId !== null && <PathBody />}
    </PageContainer>
  );
}
