/**
 * OldBibleAddressRedirect: sends an old Story Atlas address, /plan/s/<slug>/bible/<entry>, to its
 * new home, /plan/s/<slug>/world/<entry> (bundle ADMIN-2, part a2).
 *
 * Why: Robert renamed the story bible to "Story world" (2 Nov 2026, 15:35, a less religious name),
 * so the address changed with it. Writers may have saved or shared the old one; this keeps those
 * links working. The search part (?edit) and the #part travel with it.
 * Who shows it: the router, for the old address only. What it calls: nothing; it redirects.
 */
import { Navigate, useLocation, useParams } from 'react-router';

/**
 * Renders the redirect.
 *
 * @returns a replace-navigation to the Story world address
 */
export function OldBibleAddressRedirect() {
  const { storySlug = '', entryId } = useParams();
  const location = useLocation();
  const entryPart = entryId === undefined ? '' : `/${entryId}`;
  const target = `/plan/s/${storySlug}/world${entryPart}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}
