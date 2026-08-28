-- 006: 웹 푸시 구독. Supabase SQL Editor에서 실행.
-- 이후 Database Webhooks에서 chat_messages INSERT → POST https://<도메인>/api/push/chat (헤더 x-webhook-secret) 등록.

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "push: own read"   on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push: own insert" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push: own update" on public.push_subscriptions for update to authenticated using (user_id = auth.uid());
create policy "push: own delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
