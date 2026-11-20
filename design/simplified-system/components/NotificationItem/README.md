# NotificationItem

One row in Notifications, newest first. Messages are a separate place with their own icon, as today (Robert, 20 Nov 2026), so this list is activity only.

- The person's avatar (Avatar), what happened in one plain sentence ("ilinca.r commented on a paragraph in The Lantern Keeper, chapter 7") and the time in `meta`.
- A comment on a paragraph quotes the paragraph's opening words in Literata italic, so the writer sees what was read before opening it. Pressing the row opens the reader at that paragraph with its comments open.
- Unread rows sit on `surface-tint` with a `thread` line at the left; read rows sit on the page. Rows split by `line-hairline`.
- New items put one `thread` dot on the bell and the count in its name ("Notifications, 2 new"), never a red badge.

**Don't:** mix messages into this list, repeat likes as a row each time (one row a day: "12 people liked chapter 6"), or use red badges.
