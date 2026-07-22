-- Per-user Finance settings — currently just the outlier threshold used by
-- the spend trend chart to separate routine daily spend from one-off big
-- purchases, previously hardcoded.
create table finance_settings (
  user_id           uuid primary key references auth.users,
  outlier_threshold numeric not null default 300,
  created_at        timestamptz default now()
);

alter table finance_settings enable row level security;
create policy "own row" on finance_settings
  for all using (auth.uid() = user_id);
