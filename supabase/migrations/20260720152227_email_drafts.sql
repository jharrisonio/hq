-- Email triage/send support. Kept separate from `tasks` so the generic
-- task model stays domain-agnostic — email_drafts is a satellite table
-- linked via task_id, owning everything Gmail-specific.

create table email_drafts (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid references tasks(id) on delete cascade,
  user_id           uuid references auth.users not null,
  gmail_draft_id    text not null,
  gmail_message_id  text,
  thread_id         text,
  to_email          text,
  subject           text,
  snippet           text,
  status            text not null default 'pending', -- 'pending' | 'approved' | 'sent' | 'failed'
  approved_at       timestamptz,
  sent_at           timestamptz,
  error             text,
  created_at        timestamptz default now()
);

alter table email_drafts enable row level security;
create policy "own rows" on email_drafts
  for all using (auth.uid() = user_id);

-- Stores the refresh token used to send Gmail drafts. Deliberately has no
-- RLS policies (default deny for anon/authenticated) — only Edge Functions
-- using the service role key can read or write this table.
create table user_google_tokens (
  user_id       uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  access_token  text,
  expires_at    timestamptz,
  updated_at    timestamptz default now()
);

alter table user_google_tokens enable row level security;
