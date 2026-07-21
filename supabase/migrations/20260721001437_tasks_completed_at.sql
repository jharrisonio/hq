-- Tracks when a task most recently became done, for the Todos "show
-- completed" filter (None/Last Day/Last Week/All). Set via trigger rather
-- than at each call site, since many places mark a task done (status
-- dropdown, send/unsubscribe/archive Edge Functions, dismiss/ignore/reject
-- hooks) — a trigger guarantees correctness regardless of which path is used.

alter table tasks add column completed_at timestamptz;

create or replace function set_task_completed_at()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if new.status = 'done' then
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.status = 'done' and old.status is distinct from 'done' then
      new.completed_at = now();
    elsif new.status is distinct from 'done' then
      new.completed_at = null;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tasks_set_completed_at
  before insert or update on tasks
  for each row
  execute function set_task_completed_at();
