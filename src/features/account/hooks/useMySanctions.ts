/**
 * useMySanctions: the signed-in person's own live sanctions (story S1-E10-06).
 *
 * Who calls it: SanctionNotice. What it calls: my_sanctions() (…_s1_e10_06_sanctions.sql), which
 * returns the kind and the dates only, never the staff note. Signed out, it never asks.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import type { Enums } from '@/lib/database.types';

import { requireClient } from './useMyNames';

/** One of the person's own sanctions. */
export interface MySanction {
  kind: Enums<'sanction_kind'>;
  startsAt: string;
  endsAt: string | null;
}

/**
 * Follows the person's own sanctions.
 *
 * @returns the live sanctions (none while loading or signed out)
 */
export function useMySanctions(): MySanction[] {
  const { userId } = useSession();
  const sanctions = useQuery<MySanction[]>({
    queryKey: ['my-sanctions', userId],
    enabled: userId !== null,
    retry: false,
    queryFn: async () => {
      const { data, error } = await (await requireClient()).rpc('my_sanctions');
      if (error !== null) throw new Error(`Could not read sanctions: ${error.message}`);
      return data.map((row) => ({ kind: row.kind, startsAt: row.starts_at, endsAt: row.ends_at }));
    },
  });
  return sanctions.data ?? [];
}
