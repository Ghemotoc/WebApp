# spaces

Spaces people create and run: a list of spaces, one space's page with its threads, rules and
owner, creating a space and changing its settings, joining and leaving, and the owner's
requests to approve (bundle FORUMS-2, part a; story S1-E8-06; design/boards/Space.dc.html), and
the moderators who help run a space, its members page and its moderation log (part b; S1-E8-07).
Each space owns one hidden forum, so its threads reuse the forums feature (`ThreadList`,
`NewThreadForm`, `ThreadPage`).

- `api/spaces.ts`: `space_list()`, `space_page()`, `space_name_available()`, `create_space()`,
  `update_space()`, `join_space()`, `leave_space()`, `space_join_requests()`,
  `decide_space_join_request()` and `my_space_age_group()`, with refusals as `SpaceError`.
- `hooks/useSpaces.ts`: the reads and changes; `hooks/useSpaceNameCheck.ts`: the name check as
  the owner types.
- `lib/spaceLook.ts`: the four drawn banners and the badge's letters; `lib/spaceFailures.ts`:
  which words a refusal gets.
- `components/SpacesPage.tsx` (`/spaces`) with `SpaceRow`; `SpacesCard` on the forum index.
- `components/SpacePage.tsx` (`/spaces/:spaceSlug`): `SpaceBreadcrumb`, `SpaceHeaderCard`
  (`SpaceBadge`, `SpacePills`, `SpaceJoinActions`, Report), the forums' `ThreadList`,
  `SpaceRequestsCard`, `SpaceRulesCard` and `SpaceRunsCard`.
- `components/NewSpacePage.tsx` (`/spaces/new`) and `SpaceSettingsPage.tsx`
  (`/spaces/:spaceSlug/settings`), both with `SpaceFormCard` and `SpaceForm` (`SpaceNameField`,
  `SpaceBannerChoice`, `SpaceRadioGroup`).
- `components/SpaceNewThreadPage.tsx` (`/spaces/:spaceSlug/new`): the forums' `NewThreadForm` on
  the space's forum.
- `api/spaceModeration.ts` and `hooks/useSpaceModeration.ts` (part b): `space_moderators()`,
  `space_member_list()`, `space_log()`, `set_space_moderator()` and `remove_space_member()`;
  `lib/spacePowers.ts` and `lib/spaceLogText.ts` for the powers' order and the log's words.
- `components/SpaceModeratorsCard.tsx` on the settings page (`SpaceModeratorRow`,
  `SpaceAddModerator`, `SpacePowerChoices`); `SpaceToolLinks` on the header;
  `SpaceMembersPage.tsx` (`/spaces/:spaceSlug/members`, with `SpaceMemberRow`) and
  `SpaceLogPage.tsx` (`/spaces/:spaceSlug/log`, with `SpaceLogLine`).
