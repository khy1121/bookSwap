-- 003: 본인 매물 삭제 허용. Supabase SQL Editor에서 실행.
drop policy if exists "delete own listing" on public.listings;
create policy "delete own listing" on public.listings
  for delete to authenticated using (auth.uid() = user_id);
