-- Standing corrections the triage automation reads before classifying each
-- email, so misjudged triage calls can be fixed going forward without
-- editing the automation's prompt/code.

create table email_triage_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  match_type  text not null,   -- 'sender' | 'domain'
  match_value text not null,   -- e.g. 'billing@example.com' or 'example.com'
  action      text not null,  -- 'always_actionable' | 'always_archive'
  note        text,
  created_at  timestamptz default now()
);

alter table email_triage_rules enable row level security;
create policy "own rows" on email_triage_rules
  for all using (auth.uid() = user_id);
