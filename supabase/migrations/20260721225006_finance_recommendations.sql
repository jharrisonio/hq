-- AI-generated finance recommendations ("cancel this subscription to save
-- $X/mo") surfaced as regular todos — same satellite-table pattern as
-- email_drafts/email_subscriptions/email_archive_candidates.

create table finance_recommendations (
  id                        uuid primary key default gen_random_uuid(),
  task_id                   uuid references tasks(id) on delete cascade,
  user_id                   uuid references auth.users not null,
  kind                      text not null, -- 'cancel_subscription' | 'switch_provider' | 'spending_habit' | 'other'
  rationale                 text not null, -- the "why" behind the suggestion
  estimated_monthly_savings numeric,       -- nullable — not every recommendation has a clean $ figure
  related_merchant          text,          -- e.g. 'Rogers' — lets feedback rules target it
  status                    text not null default 'pending', -- 'pending' | 'dismissed'
  dismissal_reason          text,          -- freeform, shown back in the detail panel after dismissing
  created_at                timestamptz default now()
);

alter table finance_recommendations enable row level security;
create policy "own rows" on finance_recommendations
  for all using (auth.uid() = user_id);

-- Feedback/memory: lets the user's reasoning ("stay with Rogers because...")
-- steer future recommendation runs. Same shape as email_triage_rules /
-- transaction_category_rules — nullable scope, hard override or freeform
-- guidance (or both).
create table finance_recommendation_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  match_type  text,   -- 'merchant' | 'kind', or null for general
  match_value text,
  action      text,   -- 'suppress' (never suggest this again), or null if just guidance
  guidance    text,
  created_at  timestamptz default now(),
  constraint finance_recommendation_rules_scope_check check (
    (match_type is null and match_value is null)
    or (match_type in ('merchant', 'kind') and match_value is not null)
  ),
  constraint finance_recommendation_rules_content_check check (
    action is not null or guidance is not null
  )
);

alter table finance_recommendation_rules enable row level security;
create policy "own rows" on finance_recommendation_rules
  for all using (auth.uid() = user_id);

-- Realtime, same as the other finance/email tables.
alter table finance_recommendations replica identity full;
alter publication supabase_realtime add table finance_recommendations;
