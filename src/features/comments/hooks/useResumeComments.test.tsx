/**
 * "Resume now" (bundle CALM-8; IDEA-20261109-8; the design handover's Step 4, point 8): it ends the
 * pause on the chapter's story and reads the story's comment lists again, or says why it couldn't.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { AppSupabaseClient } from '@/lib/supabase';

import { useResumeComments } from './useResumeComments';

vi.mock('@/features/account/hooks/useMyNames', () => ({ requireClient: vi.fn() }));

const address = { storySlug: 'statia-meteo', chapterCode: 'reace001' };

/**
 * Runs the hook against a database that answers the given result.
 *
 * @param result - what end_my_comment_pause() answers
 * @param onResumed - the parent's callback, if the test watches it
 * @returns the hook, the rpc spy and the cache's invalidate spy
 */
function renderResume(result: { data: unknown; error: unknown }, onResumed?: () => void) {
  const rpc = vi.fn().mockResolvedValue(result);
  vi.mocked(requireClient).mockResolvedValue({ rpc } as unknown as AppSupabaseClient);
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useResumeComments(address, onResumed), { wrapper });
  return { hook, rpc, invalidate };
}

describe('useResumeComments', () => {
  it('ends the pause on the story and reads all its comment lists again', async () => {
    const { hook, rpc, invalidate } = renderResume({ data: { outcome: 'ok' }, error: null });
    act(() => hook.result.current.resume());
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith('end_my_comment_pause', { story_slug: 'statia-meteo' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['chapter-comments', 'statia-meteo'] });
    expect(hook.result.current.failure).toBeNull();
  });

  it('tells the parent once the pause has ended, so the box that comes back can take the focus', async () => {
    const onResumed = vi.fn();
    const { hook, invalidate } = renderResume({ data: { outcome: 'ok' }, error: null }, onResumed);
    act(() => hook.result.current.resume());
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(onResumed).toHaveBeenCalledTimes(1);
  });

  it('says the account can’t change stories now, and reads nothing again', async () => {
    const onResumed = vi.fn();
    const { hook, invalidate } = renderResume(
      { data: { outcome: 'not_active' }, error: null },
      onResumed,
    );
    act(() => hook.result.current.resume());
    await waitFor(() => expect(hook.result.current.failure).toBe('not_active'));
    expect(invalidate).not.toHaveBeenCalled();
    expect(onResumed).not.toHaveBeenCalled();
  });

  it('treats someone else’s story as a plain failure', async () => {
    const { hook } = renderResume({ data: { outcome: 'not_found' }, error: null });
    act(() => hook.result.current.resume());
    await waitFor(() => expect(hook.result.current.failure).toBe('other'));
  });

  it('reports a failure when the database can’t be reached', async () => {
    const { hook } = renderResume({ data: null, error: { message: 'offline' } });
    act(() => hook.result.current.resume());
    await waitFor(() => expect(hook.result.current.failure).toBe('other'));
  });
});
