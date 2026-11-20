# ParagraphComments

Comments on one paragraph: a glass panel at the top of the reader's side column on wide screens, a glass sheet from the bottom on phones. Comments are on paragraphs, as today, never on single lines.

**The head** (Robert, 20 Nov 2026): no title, no count and no paragraph number. A small comment mark (`gh-cmark`: the comment icon on `surface-tint`) and the paragraph's opening words in Literata italic (`gh-quote`, cut with an ellipsis) say what it is about. Close (×) sits on the right. The count shows only on the paragraph itself.

**Each comment** (`gh-comment`)
- The avatar (Avatar, 32px), the name as a link, **Writer** in bold when the story's writer answers, and the time, in one meta line.
- **Like** with its count, **Reply** and **More** (downvote or report, as today) on the same line, on the right, in `ink-muted`, each with a 44px target.
- The words underneath, Inter 15/21.

**The field:** one pill, "Comment on this paragraph", with **Send** inside it: the one main button in the panel.

- **Wide screens:** the panel opens at the top of the side column, above About this story, and the paragraph gets `gh-para-open`. It closes with × or by pressing the count again. It never opens on page load (Robert, 20 Nov 2026).
- **Phones:** the sheet rises from the bottom over a light scrim (`gh-scrim`), with the paragraph and its count still in view above it. It is a modal dialog: focus moves into it and stays there until it closes, then returns to the count.

**Don't:** add a title, a count or "Paragraph 6" to the head, or put the field above the comments.
