/**
 * useStaffWaitlist: Staff › Waitlist's list, filters, paging and the two ways to let people in
 * (bundle WAITLIST-1).
 *
 * Who calls it: StaffWaitlistPage. What it calls: features/waitlist/api/waitlist.ts. After people
 * are let in, the list, the counts and the dashboard's number are read again, and the ticks are
 * cleared, so the page always shows what the database now holds.
 */
import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import {
  admitFromWaitlist,
  admitWaitlistWave,
  fetchStaffWaitlist,
  WaitlistError,
  type StaffWaitlist,
  type WaitlistFailure,
  type WaitlistFilter,
} from '@/features/waitlist/api/waitlist';

/** People per page. */
export const waitlistPageSize = 50;

/**
 * The reason a call failed, or null when it didn't.
 *
 * @returns the reason; unreachable for anything that isn't a WaitlistError
 */
function failureOf(hasFailed: boolean, error: unknown): WaitlistFailure | null {
  if (!hasFailed) return null;
  return error instanceof WaitlistError ? error.failure : 'unreachable';
}

/**
 * The page's filters and paging, kept together.
 *
 * @returns the values and their setters; a new filter goes back to the first page
 */
function useWaitlistFilters() {
  const [interest, setInterestValue] = useState<WaitlistFilter>(null);
  const [country, setCountryValue] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  return {
    interest,
    country,
    page,
    setPage,
    setInterest: (value: WaitlistFilter) => {
      setInterestValue(value);
      setPage(0);
    },
    setCountry: (value: string | null) => {
      setCountryValue(value);
      setPage(0);
    },
  };
}

/**
 * Follows the waiting list for staff.
 *
 * @returns the list, the filters, the ticked entries and the admit actions with their states
 */
export function useStaffWaitlist() {
  const queryClient = useQueryClient();
  const filters = useWaitlistFilters();
  const [ticked, setTicked] = useState<string[]>([]);
  const [admittedCount, setAdmittedCount] = useState<number | null>(null);
  const list = useQuery<StaffWaitlist>({
    queryKey: ['staff-waitlist', filters.interest, filters.country, filters.page],
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      fetchStaffWaitlist(await requireClient(), {
        interest: filters.interest,
        country: filters.country,
        pageSize: waitlistPageSize,
        pageOffset: filters.page * waitlistPageSize,
      }),
  });

  /** After letting people in: say how many, clear the ticks and read everything again. */
  function afterAdmitting(count: number) {
    setAdmittedCount(count);
    setTicked([]);
    void queryClient.invalidateQueries({ queryKey: ['staff-waitlist'] });
    void queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
  }
  const admitTicked = useMutation({
    mutationFn: async () => admitFromWaitlist(await requireClient(), ticked),
    onSuccess: afterAdmitting,
  });
  const admitWave = useMutation({
    mutationFn: async (howMany: number) =>
      admitWaitlistWave(await requireClient(), {
        interest: filters.interest,
        country: filters.country,
        howMany,
      }),
    onSuccess: afterAdmitting,
  });

  return {
    data: list.data ?? null,
    isLoading: list.isPending,
    loadFailure: failureOf(list.isError, list.error),
    filters,
    ticked,
    toggle: (entryId: string) =>
      setTicked((current) =>
        current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId],
      ),
    admitTicked: () => admitTicked.mutate(),
    admitWave: (howMany: number) => admitWave.mutate(howMany),
    isAdmitting: admitTicked.isPending || admitWave.isPending,
    admitFailure:
      failureOf(admitTicked.isError, admitTicked.error) ??
      failureOf(admitWave.isError, admitWave.error),
    admittedCount,
  };
}
