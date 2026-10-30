/**
 * useSafetyContactWarnings: the contacts nobody confirmed for 45 days, for the warning at the top
 * of every staff page (story S1-E10-13, part b, criterion 8: "the owner sees a warning in the admin
 * site until they are checked").
 *
 * Who calls it: SafetyContactWarningBanner, only for staff with the safety contacts area.
 * What it calls: api/staffSafetyContacts.ts. Cached for five minutes; a confirm or save reads it
 * again at once (useStaffSafetyContacts invalidates every 'safety-contacts' query).
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchSafetyContactWarnings } from '../api/staffSafetyContacts';

/**
 * Follows the warnings.
 *
 * @param isEnabled - false for staff without the area, so nothing is asked
 * @returns the warnings (empty while loading or after a failed read: the banner is a reminder,
 *   and Staff › Safety contacts shows the full state)
 */
export function useSafetyContactWarnings(isEnabled: boolean) {
  const warnings = useQuery({
    queryKey: ['safety-contacts', 'staff', 'warnings'],
    enabled: isEnabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => fetchSafetyContactWarnings(await requireClient()),
  });
  return { warnings: warnings.data ?? [] };
}
