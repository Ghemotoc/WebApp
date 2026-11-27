/**
 * The Members list's choices in the page address, so a filtered list can be bookmarked, shared
 * with another admin and come back with Back (S1-E11-02 follow-up; Robert, 26 Nov 2026, 20:17
 * UTC: a status filter and "how many do you want to see per page").
 *
 * ?status=banned&perPage=10&page=2 next to the search's own ?q=. A missing or unknown value
 * falls back to the default (any status but deleted, 5 a page, page 1), so a hand-typed or old
 * address never breaks the page.
 * Who calls it: hooks/useAccountList.ts. It calls nothing; tests in accountListParams.test.ts.
 */
import type { Enums } from '@/lib/database.types';

import {
  accountListPageSizes,
  accountStatusFilters,
  defaultAccountListPageSize,
  type AccountListPageSize,
} from '../api/accountList';

/** The address names of the three choices; the search keeps its own "q". */
const statusKey = 'status';
const perPageKey = 'perPage';
const pageKey = 'page';

/** The list's choices, as read from the address. */
export interface AccountListChoices {
  status: Enums<'account_status'> | null;
  pageSize: AccountListPageSize;
  pageNumber: number;
}

/**
 * Reads the choices from the address.
 *
 * @param params - the page's search params
 * @returns the status (null for any but deleted), the page size and the page number
 */
export function accountListChoicesFrom(params: URLSearchParams): AccountListChoices {
  // Step 1: a status only when it is one the filter offers.
  const status = accountStatusFilters.find((offered) => offered === params.get(statusKey)) ?? null;
  // Step 2: a page size only when it is one on offer.
  const askedSize = Number(params.get(perPageKey));
  const pageSize =
    accountListPageSizes.find((offered) => offered === askedSize) ?? defaultAccountListPageSize;
  // Step 3: a whole page number from 1; anything else is page 1.
  const askedPage = Number(params.get(pageKey));
  const pageNumber = Number.isInteger(askedPage) && askedPage >= 1 ? askedPage : 1;
  return { status, pageSize, pageNumber };
}

/**
 * Writes the choices into the address, keeping everything else there (the search's "q").
 * Defaults are left out, so the plain list has a plain address.
 *
 * @param params - the page's search params now
 * @param choices - the choices to show
 * @returns new search params
 */
export function accountListParamsWith(
  params: URLSearchParams,
  choices: AccountListChoices,
): URLSearchParams {
  // Step 1: start from what is there, so the search above keeps its text.
  const next = new URLSearchParams(params);
  // Step 2: set or clear each choice.
  setOrClear(next, statusKey, choices.status);
  setOrClear(
    next,
    perPageKey,
    choices.pageSize === defaultAccountListPageSize ? null : String(choices.pageSize),
  );
  setOrClear(next, pageKey, choices.pageNumber === 1 ? null : String(choices.pageNumber));
  return next;
}

/**
 * Sets one address value, or removes it when there is none.
 *
 * @param params - the params to change
 * @param key - the name
 * @param value - the value, or null to remove it
 */
function setOrClear(params: URLSearchParams, key: string, value: string | null) {
  if (value === null) params.delete(key);
  else params.set(key, value);
}
