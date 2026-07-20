-- Tracks the email that actually prompted a draft, independent of the
-- draft's own thread. Needed because a reply isn't always threaded to its
-- source — e.g. a manually-forwarded email: replying in-thread would go
-- back to the forwarder, not the original correspondents, so the draft is
-- correctly composed as a new standalone thread. Without this, "original
-- email" lookup (which previously searched the draft's own thread for
-- other messages) finds nothing for forwarded cases.
alter table email_drafts add column source_message_id text;
