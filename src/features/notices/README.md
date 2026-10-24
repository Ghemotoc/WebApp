# notices

The public report form at `/report`: anyone, with or without an account, can report illegal
content, and authorities send removal orders here (story S1-E10-02; DSA art. 16; Regulation (EU)
2021/784 art. 15).

- `components/NoticePage.tsx`: the page (header, form or "Report received", side column).
- `components/NoticeForm.tsx`: the card; `NoticeKindPicker`, `ContentNoticeFields`,
  `RemovalOrderFields` and `NoticeFieldParts` are its pieces.
- `components/NoticeReceived.tsx`: the reference and the time of receipt after sending.
- `components/NoticeSideColumn.tsx`: what happens next, the safety contacts, "Have an account?"
  and "Your details".
- `lib/noticeDraft.ts`: the answers, what is missing and the request they become.
- `hooks/useNoticeForm.ts` and `api/notice.ts`: the send to `POST /api/notice`
  (`server/notice.ts`), which signs it and calls `submit_public_notice()`.

The texts are the `notices` namespace, registered when the page opens
(`registerNoticeTranslations.ts`).
