/**
 * MapCategorySwitches: the relationship map's category switches, which double as its legend
 * (story S1-E17-15: turning one off hides its lines). Each switch shows its category's colour as
 * a dot beside the name (CALM-9, board E25), in the colour the writer picked.
 * Who uses it: RelationshipMap. What it calls: the shared Chip and CategoryDot.
 */
import { Chip } from '@/components/ui/Chip';

import {
  relationshipCategories,
  type RelationshipCategory,
  type RelationshipColours,
} from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CategoryDot } from './CategoryDot';

/** What the switches need. */
export interface MapCategorySwitchesProps {
  hiddenCategories: RelationshipCategory[];
  onChange: (hiddenCategories: RelationshipCategory[]) => void;
  /** The colours the writer picked, for the dots. */
  colours: RelationshipColours;
}

/**
 * Renders one switch per category.
 *
 * @returns the labelled group of switches
 */
export function MapCategorySwitches({
  hiddenCategories,
  onChange,
  colours,
}: MapCategorySwitchesProps) {
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
          <CategoryDot category={category} colours={colours} />
          {t(`connections.categories.${category}`)}
        </Chip>
      ))}
    </div>
  );
}
