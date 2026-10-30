/**
 * useTagCatalogue: the approved tags, and helpers to show a tag in the interface language and to
 * recognise a name typed in another language (CMS-1e).
 *
 * Who calls it: the tag box (TagInput) and every screen that shows a story's tags.
 * What it calls: api/tagStore.ts once per five minutes; lib/tagCatalogue.ts for the rules. While
 * the list loads, or if it can't be read, tags show as stored, so nothing breaks.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchTagCatalogue } from '../api/tagStore';
import { findTag, nameIn, tagNameIn, type CatalogueTag } from '../lib/tagCatalogue';

/** What a screen gets. */
export interface TagCatalogue {
  /** A tag's name in the interface language. */
  showTag: (storedOrTypedName: string) => string;
  /** Whether staff approved a tag with this name, in any language. */
  isApproved: (typedName: string) => boolean;
  /** The recommended tags' names in the interface language. */
  recommended: string[];
  /** True once the list arrived, so a screen doesn't call every tag new while it loads. */
  isLoaded: boolean;
}

/**
 * The catalogue and its helpers.
 *
 * @returns showTag, isApproved, the recommended names and whether the list arrived
 */
export function useTagCatalogue(): TagCatalogue {
  const { i18n } = useTranslation();
  const query = useQuery({
    queryKey: ['tag-catalogue'],
    queryFn: async () => fetchTagCatalogue(await requireClient()),
    staleTime: 5 * 60_000,
  });
  const catalogue: CatalogueTag[] = query.data ?? [];
  const language = i18n.language;
  return {
    showTag: (name) => nameIn(catalogue, name, language),
    isApproved: (name) => findTag(catalogue, name) !== undefined,
    recommended: catalogue
      .filter((tag) => tag.isRecommended)
      .map((tag) => tagNameIn(tag, language)),
    isLoaded: query.isSuccess,
  };
}
