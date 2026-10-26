# Removal orders: what to do when one arrives (S1-E10-09)

A removal order is a formal order from a competent authority to take down terrorist content
(Regulation (EU) 2021/784). We have **one hour from receipt** to take it down or disable it
(art. 3(3)). Orders arrive through the public report form's "Removal order from an authority"
path (`/report`, S1-E10-02), which opens a case in the one-hour tier and alerts whoever is on call.

## Before anything arrives

1. An owner or admin keeps the rota at `/staff/on-call` filled: no gaps in the next 14 days. The
   page lists the gaps. Only staff with the "on call for removal orders" permission can take a
   shift (ticked per person on `/staff/roles`).
2. If nobody acknowledges an alert within 15 minutes (setting `on_call_escalation_minutes`),
   everyone with the permission is alerted. With nobody on call, everyone is alerted at once.
3. Today the alert is a row on the queue page and the support inbox email; the phone alert is a
   stub (docs/mocks.md). Whoever is on call checks the queue and the inbox.

## When an order arrives

1. Open `/staff/moderation`. Under "Removal orders received in the last 7 days", press
   **Acknowledge**. This stops the escalation and records who took it.
2. Open the case (`TCO-…`). The Removal order panel shows the received time and the deadline.
3. Check the order is real: the authority, its reference, and that the address points at something
   we host. If the address matched nothing, the order is under "Notices to check by hand": find the
   item, then close the notice with what you found.
4. Press **Emergency disable**:
   - Note for the case log: what you checked.
   - "Tell the uploader" stays ticked unless the order says not to tell them (art. 11(3)). If you
     untick it, write a reminder in the note to tell them once the authority allows it.
   - What we tell the uploader: name the authority and its reference, and nothing the order asks us
     to keep confidential.
5. The item comes down everywhere at once, the case is decided, the item is kept for six months
   (art. 6) and the authority is emailed the time of the take-down. The panel's timeline shows
   every time; that timeline is our proof.
6. If the authority's email failed, the queue shows "Decision emails waiting": press **Send
   waiting decision emails**.

## Afterwards

- Nothing in the app lets anyone delete the kept item before `preserve_until`; the purge jobs skip it.
- If the authority asks for it to be kept longer, write to the CTO: today that is a manual change.
- If the uploader wasn't told and the authority later allows it, tell them through Contact us,
  quoting the statement's reference.
