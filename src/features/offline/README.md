# Offline

The banner that says the network has dropped, and that it is back. Built by S1-E1-05 (board 7.4, card 2).

- `components/OfflineBanner.tsx`: in AppLayout, under the top bar. A status region that screen readers announce.
- `hooks/useOnlineStatus.ts`: the browser's `navigator.onLine` and its online and offline events; "back online" shows for 5 seconds.

Keeping unsaved editor text on the device comes with the chapter editor (S1-E3-02); until then the banner doesn't promise it.
