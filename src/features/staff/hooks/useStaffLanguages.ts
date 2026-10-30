/**
 * useStaffLanguages: the languages one staff member reads, and saving them (story S1-E11-05,
 * criterion 2: a language opens only when a moderator who reads it is on the rota).
 *
 * Who calls it: StaffLanguages, on each card of Staff › Roles. What it calls:
 * features/settings/api/marketsAdmin.ts. After a save, the settings page's moderator counts are
 * read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { fetchStaffLanguages, saveStaffLanguages } from '@/features/settings/api/marketsAdmin';

/**
 * Follows one staff member's languages.
 *
 * @param staffUserId - the staff member's user ID
 * @returns their languages, save(codes) and the save's state
 */
export function useStaffLanguages(staffUserId: string) {
  const queryClient = useQueryClient();
  const languages = useQuery({
    queryKey: ['staff-languages', staffUserId],
    retry: false,
    queryFn: async () => fetchStaffLanguages(await requireClient(), staffUserId),
  });
  const mutation = useMutation({
    mutationFn: async (codes: string[]) =>
      saveStaffLanguages(await requireClient(), staffUserId, codes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-languages', staffUserId] });
      await queryClient.invalidateQueries({ queryKey: ['settings-admin', 'languages'] });
    },
  });
  return {
    codes: languages.data ?? null,
    save: (codes: string[]) => mutation.mutate(codes),
    isSaving: mutation.isPending,
    isSaved: mutation.isSuccess,
    hasFailed: mutation.isError || languages.isError,
  };
}
