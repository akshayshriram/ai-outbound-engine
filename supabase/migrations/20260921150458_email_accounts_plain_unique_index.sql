-- PostgREST `on_conflict` can only name real columns, so the uniqueness key has
-- to be plain. Emails are lowercased at the write boundary instead.
drop index if exists public.email_accounts_org_user_provider_email_key;

create unique index if not exists email_accounts_org_user_provider_email_key
  on public.email_accounts (org_id, user_id, provider, email);
