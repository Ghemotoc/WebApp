/**
 * DataRequestUrgencyPill: how close a request is to its deadline, as a pill: "Overdue", "Due in
 * 2 days", "On time" or "Closed" (bundle ADMIN-2, part c1; story S1-E11-09 criterion 2, proposal:
 * a reminder 7 days before and an alert 2 days before, shown in the list and on the page).
 *
 * Who shows it: DataRequestList and StaffDataRequestPage. The words carry the meaning; the colour
 * only repeats it (DoD pill system).
 */
import { InfoPill } from '@/components/ui/InfoPill';

import type { DataRequest } from '../../api/dataRequests';
import { useDataRequestWords } from '../../hooks/useDataRequestWords';
import { urgencyTone } from '../../lib/dataRequestDates';

/**
 * Renders the pill.
 *
 * @param props.request - the request
 * @returns the pill
 */
export function DataRequestUrgencyPill({ request }: { request: DataRequest }) {
  const words = useDataRequestWords();
  return <InfoPill tone={urgencyTone(request.urgency)}>{words.urgency(request)}</InfoPill>;
}
