/**
 * StepHeader: "Step 1 of 3" and the step's heading (story S1-E2-06; board Onboarding 2.5, the
 * numbered circle above each step).
 *
 * Who shows it: OnboardingSteps, above NameStep, LikesStep, SafetyStep or TeacherStep. The heading is an h2 under the page's h1, and
 * the step line is plain text before it, so a screen reader hears where it is first. The heading
 * can take focus (tabIndex -1): OnboardingSteps moves focus to it when the step changes.
 */
import { useTranslation } from 'react-i18next';

/** The step line's text key for each kind of step. */
const stepLineKeys = {
  plain: 'onboarding.stepOf',
  safety: 'onboarding.safety.stepLine',
  teacher: 'teacherBadge.stepLine',
};

/** What the header needs. */
export interface StepHeaderProps {
  step: number;
  total: number;
  title: string;
  /** The heading's id, so the step's section can be labelled by it. */
  headingId: string;
  /**
   * Which step 3 this is, for its step line: "· for under-18s" (the safety step) or "· for adults
   * (18+) · optional" (the Teacher badge step, S1-E2-11), as the board's two step 3s say.
   */
  stepThree?: 'safety' | 'teacher' | null;
}

/**
 * Renders the header.
 *
 * @returns the step line and the heading
 */
export function StepHeader({ step, total, title, headingId, stepThree = null }: StepHeaderProps) {
  const { t } = useTranslation('account');
  const stepLineKey = stepLineKeys[stepThree ?? 'plain'];
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-9 flex-none items-center justify-center rounded-full bg-primary font-heading text-base font-bold text-on-primary"
      >
        {step}
      </span>
      <div className="flex flex-col">
        <p className="m-0 text-[13px] text-meta">{t(stepLineKey, { step, total })}</p>
        <h2
          id={headingId}
          tabIndex={-1}
          className="m-0 font-heading text-[22px] font-bold text-heading focus:outline-none"
        >
          {title}
        </h2>
      </div>
    </div>
  );
}
