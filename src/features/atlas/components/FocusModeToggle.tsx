/**
 * FocusModeToggle: "Focus mode" in the writing view (story S1-E17-23: "given focus mode, when I
 * turn it on, then the planning fields are hidden").
 *
 * A real toggle button whose state is aria-pressed, so it is never told by colour alone. Who
 * uses it: ChapterEditorPage (src/features/writing), which hides the planning panel and the
 * chapter list while it is on.
 */
import { Button } from '@/components/ui/Button';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the toggle.
 *
 * @param props.isOn - whether focus mode is on
 * @param props.onChange - called with the new state
 * @returns the button
 */
export function FocusModeToggle({
  isOn,
  onChange,
}: {
  isOn: boolean;
  onChange: (isOn: boolean) => void;
}) {
  const { t } = useAtlasTranslation();
  return (
    <Button variant="secondary" aria-pressed={isOn} onClick={() => onChange(!isOn)}>
      {t('chapterPlan.focusMode')}
    </Button>
  );
}
