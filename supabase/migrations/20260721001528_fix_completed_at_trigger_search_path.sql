-- Pin search_path on the trigger function per the security advisor —
-- unqualified references in a function without a fixed search_path can be
-- hijacked by a malicious search_path set in the calling session.
create or replace function set_task_completed_at()
returns trigger
language plpgsql
set search_path = public
as $$
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
$$;
