-- Not-actionable emails the triage automation suggests archiving, surfaced
-- as Todos for explicit approval rather than archived autonomously. Same
-- satellite-table pattern as email_drafts/email_subscriptions.

create table email_archive_candidates (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid references tasks(id) on delete cascade,
  user_id           uuid references auth.users not null,
  thread_id         text,
  gmail_message_id  text,
  from_email        text,
  subject           text,
  snippet           text,
  status            text not null default 'pending', -- 'pending' | 'archived' | 'ignored' | 'failed'
  error             text,
  created_at        timestamptz default now()
);

alter table email_archive_candidates enable row level security;
create policy "own rows" on email_archive_candidates
  for all using (auth.uid() = user_id);

-- One candidate per thread — a repeat non-actionable message in the same
-- thread shouldn't spawn another todo.
create unique index email_archive_candidates_user_thread_idx
  on email_archive_candidates (user_id, thread_id)
  where thread_id is not null;
