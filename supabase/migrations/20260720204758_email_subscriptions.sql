-- Newsletter/marketing-email unsubscribe candidates, surfaced as Todos
-- alongside reply-draft escalations. Satellite table linked via task_id,
-- same pattern as email_drafts — tasks stays domain-agnostic.

create table email_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  task_id             uuid references tasks(id) on delete cascade,
  user_id             uuid references auth.users not null,
  thread_id           text,
  from_email          text,
  from_domain         text,
  subject             text,
  unsubscribe_url     text,
  unsubscribe_method  text,  -- 'one_click_post' | 'link' | 'mailto'
  status              text not null default 'pending', -- 'pending' | 'unsubscribed' | 'dismissed' | 'failed'
  error               text,
  created_at          timestamptz default now()
);

alter table email_subscriptions enable row level security;
create policy "own rows" on email_subscriptions
  for all using (auth.uid() = user_id);
