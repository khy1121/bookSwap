-- 002: 교재 표지 + 판매자 실물 사진. Supabase SQL Editor에서 실행.

-- 1) 표지 URL (책 API에서 조회, scripts/fetch-covers.ts)
alter table public.courses add column if not exists cover_url text;

-- 2) 판매자 실물 사진 (Storage public URL 배열, 최대 3장)
alter table public.listings add column if not exists photos text[] not null default '{}';

-- 3) 공개 뷰 갱신: photos, cover_url 포함
drop view if exists public.listings_public;
create view public.listings_public
with (security_invoker = on) as
  select l.id, l.course_id, l.kind, l.book_title, l.edition, l.condition, l.price, l.note, l.status, l.created_at,
         l.photos,
         c.course, c.prof, c.book as course_book, c.cover_url
  from public.listings l left join public.courses c on c.id = l.course_id;

-- 4) Storage 버킷: 공개 읽기, 로그인 사용자는 자기 폴더(user_id/)에만 업로드
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "photos public read" on storage.objects;
create policy "photos public read" on storage.objects
  for select using (bucket_id = 'listing-photos');

drop policy if exists "photos upload own folder" on storage.objects;
create policy "photos upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos delete own" on storage.objects;
create policy "photos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
