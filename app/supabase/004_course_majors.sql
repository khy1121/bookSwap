-- 004: 과목의 소속 학과/트랙 전체 (카테고리 탐색). seed-courses.ts가 채운다.
alter table public.courses add column if not exists majors jsonb not null default '[]'::jsonb;
create index if not exists courses_majors_gin on public.courses using gin (majors jsonb_path_ops);
