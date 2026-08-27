-- 005: 1:1 채팅 (매물 × 구매자 = 방 1개). Supabase SQL Editor에서 실행.
-- Realtime: chat_messages INSERT를 참여자에게 푸시. RLS가 Realtime에도 적용된다.

create table if not exists public.chat_rooms (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  buyer_id    uuid not null references public.profiles(id) on delete cascade,
  seller_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index if not exists chat_rooms_buyer_idx on public.chat_rooms (buyer_id);
create index if not exists chat_rooms_seller_idx on public.chat_rooms (seller_id);

create table if not exists public.chat_messages (
  id          bigserial primary key,
  room_id     uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text check (body is null or char_length(body) <= 500),
  image_url   text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  check (body is not null or image_url is not null)
);
create index if not exists chat_messages_room_idx on public.chat_messages (room_id, created_at);

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

-- 방: 참여자만 본다. 생성은 구매자 본인이, 상대는 매물 주인이어야 한다.
create policy "rooms: participants read" on public.chat_rooms for select to authenticated
  using (auth.uid() in (buyer_id, seller_id));
create policy "rooms: buyer creates" on public.chat_rooms for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and seller_id = (select user_id from public.listings where id = listing_id)
  );

-- 메시지: 참여자만 읽고, 참여자 본인 명의로만 쓴다. read_at은 상대가 갱신.
create policy "messages: participants read" on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_rooms r where r.id = room_id and auth.uid() in (r.buyer_id, r.seller_id)));
create policy "messages: participant sends" on public.chat_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.chat_rooms r where r.id = room_id and auth.uid() in (r.buyer_id, r.seller_id))
  );
create policy "messages: receiver marks read" on public.chat_messages for update to authenticated
  using (sender_id <> auth.uid() and exists (select 1 from public.chat_rooms r where r.id = room_id and auth.uid() in (r.buyer_id, r.seller_id)))
  with check (sender_id <> auth.uid());

-- Realtime 발행
alter publication supabase_realtime add table public.chat_messages;

-- 채팅 사진 버킷 (공개 읽기, 참여자만 업로드: 경로 room_id/…)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "chat photos public read" on storage.objects;
create policy "chat photos public read" on storage.objects for select using (bucket_id = 'chat-photos');
drop policy if exists "chat photos participant upload" on storage.objects;
create policy "chat photos participant upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-photos'
    and exists (select 1 from public.chat_rooms r where r.id::text = (storage.foldername(name))[1] and auth.uid() in (r.buyer_id, r.seller_id))
  );

-- 내 채팅 목록: 방 + 마지막 메시지 + 안 읽음 수 + 상대 표시 정보 (security invoker → RLS 적용)
create or replace function public.my_chat_rooms()
returns table (
  room_id uuid, listing_id uuid, book_title text, course text, cover_url text, photo text,
  kind text, status text, counterpart_id uuid, last_body text, last_image boolean, last_at timestamptz, unread integer
)
language sql security invoker stable as $$
  select r.id, r.listing_id, l.book_title, c.course, c.cover_url, l.photos[1],
         l.kind, l.status,
         case when r.buyer_id = auth.uid() then r.seller_id else r.buyer_id end,
         m.body, m.image_url is not null, m.created_at,
         (select count(*)::int from public.chat_messages x where x.room_id = r.id and x.sender_id <> auth.uid() and x.read_at is null)
  from public.chat_rooms r
  join public.listings l on l.id = r.listing_id
  left join public.courses c on c.id = l.course_id
  left join lateral (select body, image_url, created_at from public.chat_messages where room_id = r.id order by created_at desc limit 1) m on true
  where auth.uid() in (r.buyer_id, r.seller_id)
  order by coalesce(m.created_at, r.created_at) desc;
$$;

create or replace function public.my_unread_count()
returns integer language sql security invoker stable as $$
  select count(*)::int from public.chat_messages x
  join public.chat_rooms r on r.id = x.room_id
  where auth.uid() in (r.buyer_id, r.seller_id) and x.sender_id <> auth.uid() and x.read_at is null;
$$;
