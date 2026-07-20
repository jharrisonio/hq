-- Unifies the three triage satellite tables into one normalized log for
-- measuring triage accuracy: the AI's suggested action vs. what the user
-- actually did. security_invoker ensures RLS on the underlying tables is
-- still enforced when queried through the API, not bypassed as the view
-- owner.

create view email_triage_outcomes
  with (security_invoker = true)
  as
  select
    id,
    user_id,
    task_id,
    'reply'::text as suggested_action,
    case status
      when 'sent' then 'agreed'
      when 'rejected' then 'disagreed'
      when 'failed' then 'failed'
      else 'pending'
    end as outcome,
    created_at
  from email_drafts
  union all
  select
    id,
    user_id,
    task_id,
    'unsubscribe'::text as suggested_action,
    case status
      when 'unsubscribed' then 'agreed'
      when 'dismissed' then 'disagreed'
      when 'failed' then 'failed'
      else 'pending'
    end as outcome,
    created_at
  from email_subscriptions
  union all
  select
    id,
    user_id,
    task_id,
    'archive'::text as suggested_action,
    case status
      when 'archived' then 'agreed'
      when 'ignored' then 'disagreed'
      when 'failed' then 'failed'
      else 'pending'
    end as outcome,
    created_at
  from email_archive_candidates;
