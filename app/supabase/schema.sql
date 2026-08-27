-- 북스왑@한성 MVP 스키마. Supabase SQL Editor에 그대로 실행.
-- 원칙: 단일 학교 전용(tenant 없음), 개인정보 최소화, 계측 테이블은 처음부터.

create extension if not exists pg_trgm;

-- 1) 과목·교수·주교재 카탈로그 (scripts/crawl → seed)
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  term        text not null,                -- '20262'
  plan        text not null unique,         -- 수업계획서 코드(분반 단위 고유키)
  major_code  text not null,
  major       text not null,
  course_code text not null,
  course      text not null,
  prof        text not null,
  bunban      text,
  book        text,                         -- 주교재 원문
  subbook     text,
  created_at  timestamptz not null default now()
);
create index if not exists courses_course_trgm on public.courses using gin (course gin_trgm_ops);
create index if not exists courses_prof_idx on public.courses (prof);
create index if not exists courses_term_idx on public.courses (term);

-- 2) 프로필: 가입일 + 유입경로는 나중에 복원 불가하므로 가입 시점에 저장
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  signed_up_at    timestamptz not null default now(),
  referral_source text
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@hansung.ac.kr' then
    raise exception 'hansung.ac.kr 이메일만 가입할 수 있습니다';
  end if;
  insert into public.profiles (id, email, referral_source)
  values (new.id, new.email, new.raw_user_meta_data ->> 'referral_source');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 3) 매물 (팔아요/구해요)
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  kind        text not null check (kind in ('sell','buy')),
  book_title  text not null,
  edition     text,
  condition   text,                          -- 새책/필기거의없음/필기있음
  price       integer check (price is null or price >= 0),
  contact     text not null,                 -- 카톡 오픈채팅 링크 or 에타 닉 (로그인 사용자에게만 노출)
  note        text,
  status      text not null default 'open' check (status in ('open','done')),
  created_at  timestamptz not null default now()
);
create index if not exists listings_course_idx on public.listings (course_id, status);
create index if not exists listings_user_idx on public.listings (user_id);

-- 연락처를 뺀 공개 뷰. 목록/검색은 이 뷰만 읽는다.
create or replace view public.listings_public
with (security_invoker = on) as
  select l.id, l.course_id, l.kind, l.book_title, l.edition, l.condition, l.price, l.note, l.status, l.created_at,
         c.course, c.prof, c.book as course_book
  from public.listings l left join public.courses c on c.id = l.course_id;

-- 4) 이벤트 로그 (user_id, event, ts, props). 활성화 이벤트 = contact_clicked
create table if not exists public.events (
  id       bigserial primary key,
  user_id  uuid,
  event    text not null,
  ts       timestamptz not null default now(),
  props    jsonb not null default '{}'::jsonb
);
create index if not exists events_event_ts on public.events (event, ts);

-- 5) RLS
alter table public.courses  enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.events   enable row level security;

create policy "courses readable by all" on public.courses for select using (true);

create policy "own profile" on public.profiles for select using (auth.uid() = id);

create policy "listings readable by authenticated" on public.listings for select to authenticated using (true);
create policy "insert own listing" on public.listings for insert to authenticated with check (auth.uid() = user_id);
create policy "update own listing" on public.listings for update to authenticated using (auth.uid() = user_id);

create policy "insert own events" on public.events for insert to authenticated with check (user_id = auth.uid());
create policy "insert anon events" on public.events for insert to anon with check (user_id is null);

-- listings_public 뷰는 security_invoker라 listings 정책을 따른다.
-- 비로그인 사용자도 목록을 볼 수 있게 하려면 아래 정책을 추가(연락처는 뷰에 없으므로 안전):
create policy "listings readable by anon" on public.listings for select to anon using (true);

-- 6) 주간 집계 (Supabase SQL Editor에서 실행)
-- select date_trunc('week', ts) w, event, count(*) from events group by 1,2 order by 1 desc,2;
