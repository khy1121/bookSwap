-- 007: 과목 새 매물 알림 구독. Supabase SQL Editor에서 실행.
-- 이후 _webhook_local_only.sql 의 listings INSERT 트리거(notify_listing_push)도 실행해야 푸시가 간다.

create table if not exists public.course_watches (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index if not exists course_watches_course_idx on public.course_watches (course_id);

alter table public.course_watches enable row level security;
create policy "watch: own read"   on public.course_watches for select to authenticated using (user_id = auth.uid());
create policy "watch: own insert" on public.course_watches for insert to authenticated with check (user_id = auth.uid());
create policy "watch: own delete" on public.course_watches for delete to authenticated using (user_id = auth.uid());

-- 과목(같은 과목명+교수, 분반 무관)의 알림 대기 인원 — 누구나 볼 수 있는 수요 신호
create or replace function public.course_watch_count(p_course_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(distinct w.user_id)::int
  from public.course_watches w
  join public.courses c on c.id = w.course_id
  join public.courses t on t.id = p_course_id
  where c.course = t.course and c.prof = t.prof;
$$;
grant execute on function public.course_watch_count(uuid) to anon, authenticated;

-- 홈 "지금 찾는 교재": 구매 희망(open buy) + 알림 대기 인원이 있는 수업 (같은 과목명+교수로 묶음, 대표 분반 1개)
create or replace function public.top_wanted_courses(p_limit int default 6)
returns table (course_id uuid, course text, prof text, cover_url text, buyers int, watchers int)
language sql stable security definer set search_path = public as $$
  with grp as (
    select c.course, c.prof, min(c.id::text)::uuid as course_id, max(c.cover_url) as cover_url,
           array_agg(c.id) as ids
    from public.courses c group by c.course, c.prof
  )
  select g.course_id, g.course, g.prof, g.cover_url,
         (select count(*)::int from public.listings l where l.course_id = any(g.ids) and l.kind = 'buy' and l.status = 'open') as buyers,
         (select count(distinct w.user_id)::int from public.course_watches w where w.course_id = any(g.ids)) as watchers
  from grp g
  where exists (select 1 from public.listings l where l.course_id = any(g.ids) and l.kind = 'buy' and l.status = 'open')
     or exists (select 1 from public.course_watches w where w.course_id = any(g.ids))
  order by buyers + watchers desc, g.course
  limit p_limit;
$$;
grant execute on function public.top_wanted_courses(int) to anon, authenticated;
