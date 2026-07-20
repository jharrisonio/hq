-- Tracks when the email triage automation last ran, so each run only
-- scans mail received since then instead of the whole inbox.

create table email_triage_state (
  user_id     uuid primary key references auth.users on delete cascade,
  last_run_at timestamptz,
  updated_at  timestamptz default now()
);

alter table email_triage_state enable row level security;
create policy "own rows" on email_triage_state
  for all using (auth.uid() = user_id);
