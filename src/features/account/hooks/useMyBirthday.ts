/**
 * useMyBirthday: the signed-in person's optional birthday, and saving it (story S1-E2-12).
 *
 * Who calls it: BirthdaySettingsSection. What it calls: api/birthday.ts. After a save the
 * greeting line (my_greeting(), key ['my-greeting']) is read again, so a birthday saved today
 * shows at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyBirthday, saveMyBirthday, type Birthday } from '../api/birthday';

import { requireClient } from './useMyNames';

/**
 * Follows the birthday and holds the save.
 *
 * @returns the saved birthday (null while loading), save(), and the saving, saved and failed states
 */
export function useMyBirthday() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const birthday = useQuery<Birthday>({
    queryKey: ['my-birthday', userId],
    enabled: userId !== null,
    queryFn: async () => fetchMyBirthday(await requireClient()),
  });

  const save = useMutation<Birthday, Error, Birthday>({
    mutationFn: async (wanted) => saveMyBirthday(await requireClient(), wanted),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['my-birthday', userId], saved);
      await queryClient.invalidateQueries({ queryKey: ['my-greeting', userId] });
    },
  });

  return {
    birthday: birthday.data ?? null,
    loadFailed: birthday.isError,
    save: (wanted: Birthday) => save.mutate(wanted),
    reset: () => save.reset(),
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    saveFailed: save.isError,
  };
}
