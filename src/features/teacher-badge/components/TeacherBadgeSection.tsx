/**
 * TeacherBadgeSection: Settings › Teacher badge (story S1-E2-11; the story's proposal: "the badge
 * can be asked for later from Settings").
 *
 * Who shows it: SettingsPage, after the likes section. What it calls: useMyTeacherCheck. It shows
 * only to someone who may ask, holds the badge or has asked before, so a person under 18 never
 * sees it (criterion 1: the badge is for adults). The id "teacher-badge" is where the Teacher
 * badge notifications link to.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { MyTeacherCheck } from '../api/teacherBadge';
import { useMyTeacherCheck } from '../hooks/useMyTeacherCheck';

import { TeacherBadgePanel } from './TeacherBadgePanel';

/**
 * Whether the section has anything to show this person.
 *
 * @returns true when they may ask, hold the badge or have asked before
 */
function isForThisPerson(teacherCheck: MyTeacherCheck): boolean {
  return teacherCheck.canAsk || teacherCheck.isTeacher || teacherCheck.latest !== null;
}

/**
 * Renders the section.
 *
 * @returns the section, or null for someone it isn't for
 */
export function TeacherBadgeSection() {
  const { t } = useTranslation('account');
  const state = useMyTeacherCheck();
  const { teacherCheck } = state;
  if (state.loadFailed) return <Notice tone="error">{t('onboarding.loadFailed')}</Notice>;
  if (teacherCheck == null || !isForThisPerson(teacherCheck)) return null;
  return (
    <section
      id="teacher-badge"
      aria-labelledby="settings-teacher-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-teacher-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('teacherBadge.settings.heading')}
      </h2>
      <p className="m-0 text-body">{t('teacherBadge.settings.intro')}</p>
      <TeacherBadgePanel idPrefix="settings" teacherCheck={teacherCheck} state={state} />
    </section>
  );
}
