-- A reply-draft todo can now be archived directly instead of sent/rejected
-- (see archive-email edge function). Treat it the same as 'rejected' for
-- triage accuracy — the automation suggested a reply and the user disagreed.

create or replace view email_triage_outcomes
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
      when 'archived' then 'disagreed'
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
