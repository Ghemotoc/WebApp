/**
 * MapCategorySwitches: the relationship map's category switches, which double as its legend
 * (story S1-E17-15: each category has its own colour and line style, so meaning never rests on
 * colour alone; each switch shows a sample of its line, and turning one off hides its lines).
 * Who uses it: RelationshipMap. What it calls: the shared Chip and the category helpers.
 */
import { Chip } from '@/components/ui/Chip';

import {
  lineStyles,
  relationshipCategories,
  type RelationshipCategory,
} from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** A short sample of one category's line, for its switch. */
function LineSample({ category }: { category: RelationshipCategory }) {
  const style = lineStyles[category];
  return (
    // The sample sits on the card's colour, so it shows on a switched-on (dark) chip too.
    <svg
      aria-hidden="true"
      width="32"
      height="14"
      viewBox="0 0 32 14"
      className="shrink-0 rounded-full bg-surface"
    >
      <line
        x1="4"
        y1="7"
        x2="28"
        y2="7"
        stroke={style.colour}
        strokeWidth={style.width}
        strokeDasharray={style.dashes}
      />
    </svg>
  );
}

/** What the switches need. */
export interface MapCategorySwitchesProps {
  hiddenCategories: RelationshipCategory[];
  onChange: (hiddenCategories: RelationshipCategory[]) => void;
}

/**
 * Renders one switch per category.
 *
 * @returns the labelled group of switches
 */
export function MapCategorySwitches({ hiddenCategories, onChange }: MapCategorySwitchesProps) {
  const { t } = useAtlasTranslation();

  /** Turns one category's lines on or off. */
  function toggle(category: RelationshipCategory, isShown: boolean) {
    onChange(
      isShown
        ? hiddenCategories.filter((hidden) => hidden !== category)
        : [...hiddenCategories, category],
    );
  }

  return (
    <div
      role="group"
      aria-label={t('connections.map.categoriesLabel')}
      className="flex flex-wrap gap-2"
    >
      {relationshipCategories.map((category) => (
        <Chip
          key={category}
          isPressed={!hiddenCategories.includes(category)}
          onPressedChange={(isShown) => toggle(category, isShown)}
        >
          <LineSample category={category} />
          {t(`connections.categories.${category}`)}
        </Chip>
      ))}
    </div>
  );
}
