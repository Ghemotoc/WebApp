# LineChart

One measure over time as a line, such as followers on Write (Robert, 20 Nov 2026: a line graph, not bars, with a time range menu like LinkedIn's).

- **Time range:** a drop-down at the top right, named "Time range": Last 7 days, Last 30 days, Last 90 days (the default) and Last 365 days. Changing it redraws the line; the heading keeps today's total.
- **Points:** one a day for 7 and 30 days, one a week (Monday to Sunday) for 90 days, one a month for 365 days. The caption says which: "Followers at the end of each week. Weeks start on Monday."
- **Marks:** a 2px line in `thread` with a 10% wash under it, hairline grid lines (`line-hairline`) at round numbers, axis text in `ink-muted` at 12px, and the last point as a 4px dot with a `surface-page` ring and its value written beside it. No other point is labelled.
- **Hover:** each point has a hit area as wide as the gap between points (`gh-chart__hits`); it shows a hairline crosshair and a tooltip on `surface-solid` with `shadow-raised`: "**81** followers, week of 6 Oct · +12".
- **Screen readers and keyboards:** the drawing is hidden, and a table (week, followers, new that week) carries the same numbers, with the time range in its caption.
- The heading states the total ("147 followers") and the meta line the change ("+21 this week"), so the chart is never the only place a number lives.

**Don't:** use bars for a running total, add a second line with its own scale, colour the line by rise or fall, or label every point.
