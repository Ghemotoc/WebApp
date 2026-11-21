/**
 * ClassicEditionsTable and ClassicEditionForm: what staff see of a classic's languages (bundle
 * TRANSLATE-1d; board TrStaff; Robert, 16 Nov 2026).
 */
import { fireEvent, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { emptyClassicDetails, type ClassicWork } from '../../api/classics';
import { registerStaffTranslations } from '../../registerStaffTranslations';

import { ClassicEditionForm } from './ClassicEditionForm';
import { ClassicEditionsTable } from './ClassicEditionsTable';

/** Loads the staff texts first, as StaffLayout does around every staff page. */
function WithStaffTexts({ children }: { children: ReactElement }) {
  const { i18n } = useTranslation();
  registerStaffTranslations(i18n);
  return children;
}

/** Renders a staff component in English with its texts. */
function renderStaff(element: ReactElement) {
  return renderWithProviders(<WithStaffTexts>{element}</WithStaffTexts>, 'en');
}

/** A chapter in a given state. */
const chapter = (status: 'published' | 'draft') => ({
  code: `c-${status}`,
  title: 'I',
  wordCount: 10,
  status,
});

const original: ClassicWork = {
  ...emptyClassicDetails,
  storyId: 'ro-id',
  slug: 'amintiri',
  title: 'Amintiri din copilărie',
  authorName: 'Ion Creangă',
  authorDiedYear: 1889,
  freeMarkets: { RO: true, EU: true, UK: true, US: true },
  chapters: [chapter('published'), chapter('published')],
  wasPublished: true,
  detailsChecked: true,
  hiddenInCountries: [],
  updatedAt: '2026-11-16T10:00:00Z',
};

const english: ClassicWork = {
  ...original,
  storyId: 'en-id',
  slug: 'memories',
  title: 'Memories of My Boyhood',
  languageCode: 'en',
  translatorName: 'Ana Vlad',
  translationRights: 'made_for_platform',
  editionOfStoryId: 'ro-id',
  chapters: [chapter('published'), chapter('draft')],
};

const swedish: ClassicWork = {
  ...english,
  storyId: 'sv-id',
  title: 'Minnen från min barndom',
  languageCode: 'sv',
  translatorName: '',
  translationRights: '',
  chapters: [],
  wasPublished: false,
};

describe('ClassicEditionsTable', () => {
  it('shows the original as free by its author’s death, with no Edit button of its own', () => {
    renderStaff(<ClassicEditionsTable work={original} editions={[english]} onEdit={vi.fn()} />);
    const row = screen.getByRole('row', { name: /Română/ });
    expect(within(row).getByText('Original')).toBeInTheDocument();
    expect(within(row).getByText('Public domain (author died 1889)')).toBeInTheDocument();
    expect(within(row).getByText('2 of 2')).toBeInTheDocument();
    expect(within(row).getByText('No translator')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('shows a translation’s translator, rights and how many chapters are live', () => {
    const onEdit = vi.fn();
    renderStaff(<ClassicEditionsTable work={original} editions={[english]} onEdit={onEdit} />);
    const row = screen.getByRole('row', { name: /English/ });
    expect(within(row).getByText('Ana Vlad')).toBeInTheDocument();
    expect(within(row).getByText(/^Made for /)).toBeInTheDocument();
    expect(within(row).getByText('1 of 2')).toBeInTheDocument();
    expect(within(row).getByText('Published')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'Edit the English edition' }));
    expect(onEdit).toHaveBeenCalledWith('en-id');
  });

  it('says "Not checked" and Draft for an edition whose rights nobody chose yet', () => {
    renderStaff(<ClassicEditionsTable work={original} editions={[swedish]} onEdit={vi.fn()} />);
    const row = screen.getByRole('row', { name: /Svenska/ });
    expect(within(row).getByText('Not checked')).toBeInTheDocument();
    expect(within(row).getByText('0 of 2')).toBeInTheDocument();
    expect(within(row).getByText('Draft')).toBeInTheDocument();
  });
});

describe('ClassicEditionForm', () => {
  const blank = {
    languageCode: 'en',
    title: '',
    blurb: '',
    translatorName: '',
    translatorDiedYear: '',
    translationRights: '' as const,
  };

  it('asks for the translator’s year of death only for a public-domain translation', () => {
    renderStaff(
      <ClassicEditionForm
        formId="new"
        initial={blank}
        languageChoices={['en', 'sv']}
        isSaving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Year the translator died')).toBeNull();
    fireEvent.change(screen.getByLabelText('Translation rights'), {
      target: { value: 'public_domain' },
    });
    expect(screen.getByLabelText('Year the translator died')).toBeInTheDocument();
  });

  it('saves what staff typed, and offers no language choice for an existing edition', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderStaff(
      <ClassicEditionForm
        formId="en-id"
        initial={blank}
        languageChoices={null}
        isSaving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Language')).toBeNull();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Memories' } });
    fireEvent.change(screen.getByLabelText('Translator'), { target: { value: 'Ana Vlad' } });
    fireEvent.change(screen.getByLabelText('Translation rights'), {
      target: { value: 'signed_licence' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    expect(onSave).toHaveBeenCalledWith({
      ...blank,
      title: 'Memories',
      translatorName: 'Ana Vlad',
      translationRights: 'signed_licence',
    });
  });
});
