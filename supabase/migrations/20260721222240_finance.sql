-- Finance section, starting with CIBC credit card transaction insights.
-- HQ handles CSV import (mechanical, no AI needed); a Cowork scheduled task
-- categorizes pending transactions and flags subscriptions, same division
-- of labor as the email triage system.

create table financial_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  name          text not null,
  institution   text not null default 'cibc',
  account_type  text not null default 'credit_card', -- 'credit_card' | 'brokerage' (later)
  created_at    timestamptz default now()
);

alter table financial_accounts enable row level security;
create policy "own rows" on financial_accounts
  for all using (auth.uid() = user_id);

create table transactions (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid references financial_accounts(id) on delete cascade,
  user_id         uuid references auth.users not null,
  txn_date        date not null,
  description     text not null,   -- raw merchant string from the statement
  amount          numeric not null, -- positive = charge/spend, negative = payment/credit
  merchant        text,             -- normalized name, filled by the categorization pass
  category        text,             -- filled by the categorization pass
  is_subscription boolean not null default false,
  note            text,             -- e.g. "Charged monthly since March 2026, $15.99/mo"
  status          text not null default 'pending', -- 'pending' | 'categorized'
  raw_row         jsonb,            -- original CSV row, for re-processing/debugging
  created_at      timestamptz default now()
);

alter table transactions enable row level security;
create policy "own rows" on transactions
  for all using (auth.uid() = user_id);

-- Re-uploading an overlapping CSV export (e.g. "last 30 days" each time)
-- shouldn't create duplicates.
create unique index transactions_dedup_idx
  on transactions (account_id, txn_date, description, amount);

create table transaction_category_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  match_type  text,   -- 'merchant' | 'description_contains', or null for general
  match_value text,
  category    text,   -- hard override category, or null if just guidance
  guidance    text,
  created_at  timestamptz default now(),
  constraint transaction_category_rules_scope_check check (
    (match_type is null and match_value is null)
    or (match_type in ('merchant', 'description_contains') and match_value is not null)
  ),
  constraint transaction_category_rules_content_check check (
    category is not null or guidance is not null
  )
);

alter table transaction_category_rules enable row level security;
create policy "own rows" on transaction_category_rules
  for all using (auth.uid() = user_id);

-- Realtime, same as the email tables — the category pass updates rows in
-- the background and the UI should pick that up live.
alter table transactions replica identity full;
alter publication supabase_realtime add table transactions;
