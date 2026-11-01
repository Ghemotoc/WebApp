# MESSAGES-c plan: S1-E9-02 block and report inside messages

- Database `20261112100001_s1_e9_02_block_and_report.sql`: `message_with_context()` (internal; the reported message and up to 20 before it, oldest first), `admin_case_message(case)` (moderation staff who may see the case; logged sensitive read), `case_item_content()` gains the context for the evidence pack. Blocking reuses `set_block()`; messages already refuse a blocked pair.
- pgTAP `207-messages-block-and-report`: context (21, order, nothing after, start of chat), who may read it, the log, the evidence pack, block ends messages and follows both ways and tells nobody.
- Screens: ChatHeader (Block, Report profile), ChatBlockDialog (board copy), the report dialog's message line, CaseMessagePanel on the case page.
- e2e `messages-block-and-report.spec.ts`: report → case page with context; block from the chat; axe on the case page in 12 views.
