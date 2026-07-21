-- Lets the frontend subscribe to live changes on these tables (e.g. the
-- triage automation inserting a new todo) instead of requiring a manual
-- refresh. REPLICA IDENTITY FULL ensures old-row data (including user_id)
-- is included on UPDATE/DELETE payloads, which Realtime's RLS-based
-- authorization needs to evaluate "own rows" policies correctly.

alter table tasks replica identity full;
alter table email_drafts replica identity full;
alter table email_subscriptions replica identity full;
alter table email_archive_candidates replica identity full;

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table email_drafts;
alter publication supabase_realtime add table email_subscriptions;
alter publication supabase_realtime add table email_archive_candidates;
