/**
 * A cover saved in another tab (made in Canva) comes into the open Story settings form by itself
 * (bundle IDEAS-2, part d; idea IDEA-20261101-11).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { StoryCoverChoice } from '@/schemas/story';

import { useArrivingCover } from './useArrivingCover';

/** What the hook is given on each render. */
interface Props {
  path: string | null;
  cover: StoryCoverChoice;
}

/**
 * Runs the hook with a story whose saved cover the test can change.
 *
 * @returns the hook, the cover setter and the query client
 */
function renderArriving(first: Props) {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const setCover = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    ({ path, cover }: Props) =>
      useArrivingCover({ slug: 'statia-meteo', coverTallPath: path }, cover, setCover),
    { initialProps: first, wrapper },
  );
  return { hook, setCover, invalidate };
}

const automatic: StoryCoverChoice = { kind: 'automatic' };

describe('useArrivingCover', () => {
  it('says nothing while the saved cover stays the same', () => {
    const { hook, setCover } = renderArriving({ path: null, cover: automatic });
    hook.rerender({ path: null, cover: automatic });
    expect(hook.result.current).toBeNull();
    expect(setCover).not.toHaveBeenCalled();
  });

  it('puts a cover saved in another tab in the form and reads its picture again', () => {
    const { hook, setCover, invalidate } = renderArriving({ path: null, cover: automatic });
    hook.rerender({ path: 'story-id/canva.png', cover: automatic });
    expect(setCover).toHaveBeenCalledWith({ kind: 'upload', tallPath: 'story-id/canva.png' });
    expect(hook.result.current).toBe('story-id/canva.png');
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['story-cover-picture', 'statia-meteo'],
    });
  });

  it('stays quiet when the new cover is the one the writer uploaded in this form', () => {
    const uploaded: StoryCoverChoice = { kind: 'upload', tallPath: 'story-id/mine.png' };
    const { hook, setCover } = renderArriving({ path: null, cover: uploaded });
    hook.rerender({ path: 'story-id/mine.png', cover: uploaded });
    expect(setCover).not.toHaveBeenCalled();
    expect(hook.result.current).toBeNull();
  });
});
