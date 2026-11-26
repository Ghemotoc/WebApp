/**
 * ClassGradeGuide: "What the grade changes", beside the new class form (bundle BOOKS-8, part 8b;
 * board G07-ClassNew, user story 8.7: "The grade decides whether competitions can have a
 * Winner"; Robert, 13 Nov 2026, decision 10: classes below the 8th grade never have winners).
 *
 * Three label and value rows, the label at the left and the words at the right, a fine line
 * above each (DoD: label and value lists have a 1 px line between rows).
 * Who uses it: NewClassSpaceForm. What it calls: LabelRows.
 */
import { LabelRows } from '@/components/ui/LabelRows';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the section.
 *
 * @returns the heading and the three rows
 */
export function ClassGradeGuide() {
  const { t } = useSpacesTranslation();
  return (
    <section aria-labelledby="class-grade-guide" className="flex flex-col gap-2">
      <h2 id="class-grade-guide" className="m-0 type-subheading">
        {t('classNew.guideTitle')}
      </h2>
      <LabelRows
        look="spread"
        rows={[
          { label: t('classNew.guideHigh'), value: t('classNew.guideHighValue') },
          { label: t('classNew.guideLow'), value: t('classNew.guideLowValue') },
          { label: t('classNew.guideAny'), value: t('classNew.guideAnyValue') },
        ]}
      />
    </section>
  );
}
