-- Phase 2: Gmail OAuth. Tokens are stored as AES-256-GCM ciphertext, never plaintext.

alter table public.email_accounts
  alter column provider set default 'gmail';

update public.email_accounts set provider = 'gmail' where provider is null;

alter table public.email_accounts
  alter column provider set not null,
  alter column email set not null;

alter table public.email_accounts
  add column if not exists token_expires_at timestamptz,
  add column if not exists status text not null default 'connected',
  add column if not exists oauth_metadata jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.email_accounts
  drop constraint if exists email_accounts_status_check;
alter table public.email_accounts
  add constraint email_accounts_status_check
  check (status in ('connected', 'reauth_required', 'revoked'));

-- Guard rail: the token columns must hold our envelope, not a raw provider token.
-- Envelope: v1:<iv b64>:<auth tag b64>:<ciphertext b64>
alter table public.email_accounts
  drop constraint if exists email_accounts_access_token_encrypted_check;
alter table public.email_accounts
  add constraint email_accounts_access_token_encrypted_check
  check (
    access_token is null
    or access_token ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$'
  );

alter table public.email_accounts
  drop constraint if exists email_accounts_refresh_token_encrypted_check;
alter table public.email_accounts
  add constraint email_accounts_refresh_token_encrypted_check
  check (
    refresh_token is null
    or refresh_token ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$'
  );

alter table public.email_accounts
  drop constraint if exists email_accounts_oauth_metadata_check;
alter table public.email_accounts
  add constraint email_accounts_oauth_metadata_check
  check (oauth_metadata is null or jsonb_typeof(oauth_metadata) = 'object');

-- Reconnecting the same mailbox updates it in place; a different address adds a row.
create unique index if not exists email_accounts_org_user_provider_email_key
  on public.email_accounts (org_id, user_id, provider, lower(email));

drop trigger if exists email_accounts_set_updated_at on public.email_accounts;
create trigger email_accounts_set_updated_at
  before update on public.email_accounts
  for each row execute function public.set_updated_at();

comment on column public.email_accounts.access_token is
  'AES-256-GCM ciphertext of the provider access token, envelope "v1:<iv>:<tag>:<ciphertext>" (base64). Decrypt via lib/crypto.ts.';
comment on column public.email_accounts.refresh_token is
  'AES-256-GCM ciphertext of the provider refresh token, same envelope as access_token. Null when the provider returned no refresh token.';
comment on column public.email_accounts.token_expires_at is
  'Absolute expiry of the current access token; typed so refresh scheduling can compare it in SQL.';
comment on column public.email_accounts.status is
  'connected | reauth_required (refresh failed, user must re-consent) | revoked (user disconnected or provider revoked).';
comment on column public.email_accounts.oauth_metadata is
  'Non-secret OAuth details that will grow over time: granted "scope", "token_type", provider account "sub", "connected_at". Parsed at the lib/google/oauth.ts boundary.';
