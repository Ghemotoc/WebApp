> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E6 Comments, reactions and follows

**Back end and build order:** section 1.7, group C (screen 3.5), wave 4.

##### S1-E6-01 Comment on a chapter

As a reader, I want to comment on a chapter so that I can talk to the writer and other readers.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01, S1-E10-01
- **Acceptance criteria:**
  - Given a chapter with comments on, when a verified user comments, then the comment (up to 2,000 characters, canvas 3.5) appears with replies one level deep.
  - Given a comment marked as a spoiler, when others view it, then the text is hidden until they tap "Show spoiler".
  - Given the writer of the story, when they view comments, then they can delete any comment on their own story.
  - Given an account over its comment limit (set in admin by S1-E10-12 and S1-E11-03; the starting proposal on canvas 8.6 is 5 an hour in the first 24 hours and 60 an hour after), when the next comment is sent, then it is refused with a message saying how long to wait.
- **Legal and compliance:** every comment has a report button (DSA Art 16). Links get `rel="nofollow ugc"`. Emoji-only comments are never deleted automatically (decided 16 Oct 2026, late evening, Q25).

##### S1-E6-02 Emoji reactions on comments

As a reader, I want to react to a comment with an emoji so that I can respond without writing.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E6-01
- **Acceptance criteria:**
  - Given a comment, when a user reacts, then they choose one from a fixed set of six emoji (proposal) and can change or remove it.
  - Given reaction counts, when a screen reader reads them, then each reaction has a text name (for example "heart, 4").
- **Legal and compliance:** emoji stay in user content only; the interface itself uses no emoji (design direction).

##### S1-E6-03 Like a chapter

As a reader, I want to like a chapter so that the writer knows I enjoyed it.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E4-01
- **Acceptance criteria:**
  - Given a chapter, when a signed-in reader taps "Like", then the like toggles and the count updates.
  - Given likes, when the popularity job runs, then they feed the score.
- **Legal and compliance:** none beyond the global checklist.

##### S1-E6-04 Private downvote

As a reader, I want to quietly downvote a bad comment or post so that moderators notice it without public pile-ons.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E6-01, S1-E10-03
- **Acceptance criteria:**
  - Given a comment or forum post, when a user downvotes it, then no one sees a downvote count, including the author.
  - Given downvotes from distinct accounts reach the configured threshold, when the threshold is crossed, then the item enters the moderation queue at the lowest priority.
  - Given an account less than 24 hours old (proposal), when it downvotes, then the vote is not counted.
- **Legal and compliance:** decided: downvotes are private and feed moderation only (Q22). They never affect ranking.

##### S1-E6-05 Follow a writer or a story

As a reader, I want to follow writers and stories so that I hear about new chapters.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E5-05
- **Acceptance criteria:**
  - Given a profile or story, when a user taps "Follow", then they follow it and can unfollow at any time.
  - Given a writer's follower count, when it is shown, then the number is public but the list of followers is visible only to the writer.
  - Given a blocked user, when they try to follow the person who blocked them, then it fails silently.
- **Legal and compliance:** follower lists visible to the writer only (decided 16 Oct 2026, late evening, Q50), to protect minors.

##### S1-E6-06 Inline paragraph comments

As a reader, I want to comment on a single paragraph so that I can react to a specific moment.

- **Priority:** Could · **Size:** L · **Depends on:** S1-E6-01
- **Acceptance criteria:**
  - Given a paragraph, when a reader taps its comment marker, then they see and add comments for that paragraph only.
  - Given the writer edits a chapter, when a paragraph changes, then its comments stay attached by a stable paragraph ID or move to "comments on an earlier version".
- **Legal and compliance:** the research marks this as a strong Stage 1b candidate (Wattpad added it in February 2014).

---
