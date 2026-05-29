drop index if exists public.device_tokens_token_key;
create unique index if not exists device_tokens_user_token_key on public.device_tokens(user_id, token);
