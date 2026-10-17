/**
 * Tests for the Legal centre page and the "We've updated our Terms" notice (story S1-E14-01).
 * The data hooks are replaced with fixed answers, so these tests check what the screens do with
 * them; the database side is tested in supabase/tests/database/015 to 017.
 */
import { fireEvent, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { LegalVersion } from '../api/legalDocuments';
import { useLegalAcceptance } from '../hooks/useLegalAcceptance';
import { useLegalVersions } from '../hooks/useLegalVersions';

import { LegalCentrePage } from './LegalCentrePage';
import { LegalUpdateNotice } from './LegalUpdateNotice';

vi.mock('../hooks/useLegalVersions', () => ({ useLegalVersions: vi.fn() }));
vi.mock('../hooks/useLegalAcceptance', () => ({ useLegalAcceptance: vi.fn() }));

/** A stored terms text with one line that applies after the invited test and one placeholder. */
const termsBody = [
  '## In short',
  '',
  '- The agreement with {{productName}}.',
  '',
  '## 1. Who can join',
  '',
  '**In short** (as on the board)',
  '',
  '- {{afterTheInvitedTest}} You must be 13 or older.',
  '',
  '**Full text**',
  '',
  'The licence lasts [number] days.',
].join('\n');

/** One version row, in the given language. */
function version(language: string): LegalVersion {
  return {
    id: `terms-${language}`,
    version_label: '0.1',
    language,
    title: language === 'ro' ? 'Termeni de utilizare' : 'Terms of use',
    body_markdown: termsBody,
    change_summary: null,
    is_lawyer_reviewed: false,
    published_at: '2026-10-17T12:00:00Z',
  };
}

/** Pretends the versions have loaded. */
function loadedVersions(versions: LegalVersion[]) {
  vi.mocked(useLegalVersions).mockReturnValue({
    isPending: false,
    isError: false,
    data: versions,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useLegalVersions>);
}

/** Opens the Legal centre at an address. */
function openLegalCentre(path: string, language: 'ro' | 'en' = 'en') {
  const router = createMemoryRouter(
    [{ path: '/legal/:documentSlug', element: <LegalCentrePage /> }],
    {
      initialEntries: [path],
    },
  );
  return renderWithProviders(<RouterProvider router={router} />, language);
}

describe('LegalCentrePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the terms with their sections, the draft status and the version history', () => {
    loadedVersions([version('en'), version('ro')]);
    openLegalCentre('/legal/terms');
    expect(screen.getByRole('heading', { level: 2, name: 'Terms of use' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Who can join' })).toBeInTheDocument();
    expect(
      screen.getByText('Draft: a Romanian lawyer reviews this before launch'),
    ).toBeInTheDocument();
    expect(screen.getByText('In Romanian and English')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Version history' })).toBeInTheDocument();
  });

  it('marks a line that applies only after the invited test, and explains the label', () => {
    loadedVersions([version('en')]);
    openLegalCentre('/legal/terms');
    expect(screen.getByText('After the invited test')).toBeInTheDocument();
    expect(
      screen.getByText(/describe things that start only after the invited test/),
    ).toBeInTheDocument();
  });

  it('highlights a placeholder that is still to be decided', () => {
    loadedVersions([version('en')]);
    openLegalCentre('/legal/terms');
    expect(screen.getByText('[number]').tagName).toBe('MARK');
  });

  it('fills the product name from the brand config', () => {
    loadedVersions([version('en')]);
    openLegalCentre('/legal/terms');
    expect(screen.getByText(/The agreement with/).textContent).not.toContain('{{productName}}');
  });

  it('shows the Romanian draft in Romanian, says it is an unchecked translation and marks its language', () => {
    loadedVersions([version('en'), version('ro')]);
    openLegalCentre('/legal/terms', 'ro');
    const title = screen.getByRole('heading', { level: 2, name: 'Termeni de utilizare' });
    expect(title).toHaveAttribute('lang', 'ro');
    expect(screen.getByText(/nu a fost verificată de un avocat/)).toBeInTheDocument();
  });

  it('shows the English text, and says so, when there is no text in the reader’s language', () => {
    loadedVersions([version('en')]);
    openLegalCentre('/legal/terms', 'ro');
    expect(screen.getByRole('heading', { level: 2, name: 'Terms of use' })).toHaveAttribute(
      'lang',
      'en',
    );
    expect(screen.getByText(/îl arătăm în engleză/)).toBeInTheDocument();
  });

  it('marks the open document in the row of documents', () => {
    loadedVersions([version('en')]);
    openLegalCentre('/legal/terms');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Privacy notice' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('says plainly when the page could not load, and offers to try again', () => {
    const refetch = vi.fn();
    vi.mocked(useLegalVersions).mockReturnValue({
      isPending: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useLegalVersions>);
    openLegalCentre('/legal/terms');
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load this page');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('says there is no such document for an unknown address', () => {
    loadedVersions([]);
    openLegalCentre('/legal/nothing-here');
    expect(
      screen.getByRole('heading', { name: 'There’s no document at this address' }),
    ).toBeInTheDocument();
  });
});

describe('LegalUpdateNotice', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Opens the notice inside a router, because it links to the Legal centre. */
  function openNotice() {
    const router = createMemoryRouter([{ path: '/', element: <LegalUpdateNotice /> }]);
    return renderWithProviders(<RouterProvider router={router} />, 'en');
  }

  it('shows nothing when nothing waits (or nobody is signed in)', () => {
    vi.mocked(useLegalAcceptance).mockReturnValue({
      documentsToAccept: [],
      accept: vi.fn(),
      isAccepting: false,
      acceptFailed: false,
    });
    const { container } = openNotice();
    expect(container).toBeEmptyDOMElement();
  });

  it('asks a signed-in person to accept the new terms, links to them and records the acceptance', () => {
    const accept = vi.fn();
    vi.mocked(useLegalAcceptance).mockReturnValue({
      documentsToAccept: [
        { document_slug: 'terms', version_label: '0.2', change_summary: 'Clearer rules' },
      ],
      accept,
      isAccepting: false,
      acceptFailed: false,
    });
    openNotice();
    expect(screen.getByRole('heading', { name: 'We’ve updated our Terms' })).toBeInTheDocument();
    expect(screen.getByText('Version 0.2 of the Terms: Clearer rules')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read what changed' })).toHaveAttribute(
      'href',
      '/legal/terms',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Accept and continue' }));
    expect(accept).toHaveBeenCalledWith(['terms']);
  });

  it('says plainly when accepting did not work', () => {
    vi.mocked(useLegalAcceptance).mockReturnValue({
      documentsToAccept: [{ document_slug: 'terms', version_label: '0.2', change_summary: '' }],
      accept: vi.fn(),
      isAccepting: false,
      acceptFailed: true,
    });
    openNotice();
    expect(screen.getByRole('alert')).toHaveTextContent('That didn’t work');
  });
});
