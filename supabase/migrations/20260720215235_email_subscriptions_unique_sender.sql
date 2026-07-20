-- Dedup by thread_id let repeat sends from the same newsletter/marketing
-- sender each create their own "Unsubscribe" todo, since a new send is a new
-- thread. The real dedup key is the sender, not the thread — enforce it at
-- the DB level so a buggy or skipped check in the triage automation fails
-- loudly (constraint violation) instead of silently creating a duplicate.
create unique index email_subscriptions_user_sender_idx
  on email_subscriptions (user_id, from_email)
  where from_email is not null;
