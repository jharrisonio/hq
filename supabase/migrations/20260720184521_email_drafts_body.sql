-- Stores the drafted reply text itself, so the sidebar can show it inline
-- instead of just linking out to Gmail. The HQ-managed OAuth client is
-- send-only (gmail.send) and can't read draft content back from Gmail, so
-- the triage automation writes the body here at creation time — this is a
-- snapshot, not a live view of the Gmail draft.
alter table email_drafts add column body text;
