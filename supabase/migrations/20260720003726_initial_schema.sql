-- HQ initial schema: projects, tasks, contacts, and RLS policies.

create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  slug        text not null,
  icon        text,
  color       text,
  position    int default 0,
  created_at  timestamptz default now()
);

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  project_id    uuid references projects(id) on delete cascade,
  parent_id     uuid references tasks(id),
  type          text not null default 'task',    -- 'task' | 'question'
  title         text not null,
  status        text not null default 'todo',    -- 'todo' | 'blocked' | 'prepared' | 'done'
  assignee      text,                             -- 'james' | 'naomi' | 'both'
  due_date      date,
  description   text,
  deloitte_note text,
  note          text,
  is_submission boolean not null default false,   -- true = renders in the "Submission" section
  position      int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table task_links (
  id       uuid primary key default gen_random_uuid(),
  task_id  uuid references tasks(id) on delete cascade,
  label    text not null,
  url      text not null,
  category text default 'link',   -- 'link' | 'drive'
  person   text                   -- 'james' | 'naomi' | 'joint' — only used when category = 'drive'
);

create table task_relationships (
  task_id         uuid references tasks(id) on delete cascade,
  related_task_id uuid references tasks(id) on delete cascade,
  type            text not null,  -- 'blocks' | 'blocked_by'
  primary key (task_id, related_task_id, type)
);

create table contacts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  email       text,
  birthday    date,
  notes       text,
  created_at  timestamptz default now()
);

create table contact_interactions (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references contacts(id) on delete cascade,
  type        text,   -- 'gift_idea' | 'note' | 'reminder'
  body        text,
  created_at  timestamptz default now()
);

-- Row Level Security ---------------------------------------------------

alter table projects enable row level security;
create policy "own rows" on projects
  for all using (auth.uid() = user_id);

alter table tasks enable row level security;
create policy "own rows" on tasks
  for all using (auth.uid() = user_id);

alter table contacts enable row level security;
create policy "own rows" on contacts
  for all using (auth.uid() = user_id);

alter table task_links enable row level security;
create policy "own task links" on task_links
  for all using (
    exists (
      select 1 from tasks
      where tasks.id = task_links.task_id
      and tasks.user_id = auth.uid()
    )
  );

alter table task_relationships enable row level security;
create policy "own task relationships" on task_relationships
  for all using (
    exists (
      select 1 from tasks
      where tasks.id = task_relationships.task_id
      and tasks.user_id = auth.uid()
    )
  );

alter table contact_interactions enable row level security;
create policy "own contact interactions" on contact_interactions
  for all using (
    exists (
      select 1 from contacts
      where contacts.id = contact_interactions.contact_id
      and contacts.user_id = auth.uid()
    )
  );
