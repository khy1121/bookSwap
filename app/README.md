# BookSwap — 과목별 중고 교재 MVP

한성대 **과목·교수 기준**으로 중고 교재를 팔고 사는 서비스. 교수님이 수업계획서에 적은 주교재를 같이 보여준다.

스코프는 `../docs/startup/02-mvp-scope.md`의 build 3개로 제한한다:
1. 과목·교수 기준 매물 등록 + 검색
2. `@hansung.ac.kr` 이메일 매직링크 인증
3. 연락처 노출(로그인 필요) + `contact_clicked` 활성화 이벤트

스택: Next.js 16 (App Router, TS) · Supabase (Postgres + Auth) · Tailwind v4 · Vercel

## 1. Supabase 프로젝트 설정 (최초 1회, 약 15분)

1. https://supabase.com 에서 새 프로젝트 생성 (리전: Northeast Asia/Seoul 또는 Tokyo)
2. **SQL Editor** → `supabase/schema.sql` 실행 후 `supabase/002_images.sql` 전체를 붙여넣고 Run
3. **Authentication → Providers → Email**: `Enable email provider` 켜기, `Confirm email` 켜기
4. **이메일 템플릿**: 무료 플랜은 커스텀 SMTP 없이는 템플릿을 편집할 수 없다. `/auth/confirm`이 기본 템플릿(`?code=`)과 커스텀 템플릿(`?token_hash=`)을 모두 처리하므로 **그대로 두면 된다.** (나중에 Resend 등 SMTP를 붙이면 `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` 형태로 바꿀 수 있다)
5. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (배포 후 Vercel 도메인으로 변경)
   - Redirect URLs: `http://localhost:3000/auth/confirm`, `https://<vercel-domain>/auth/confirm`
6. **Project Settings → API** 에서 `Project URL`, `anon public`, `service_role` 키 복사

## 2. 로컬 실행

```bash
cp .env.example .env.local   # 키 채우기
npm install
npm run seed:courses 20262   # data/hansung_20262_textbooks.csv → courses (약 1,400행)
npm run dev                  # http://localhost:3000
```

`.env.local` 항목:
| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | seed 스크립트 전용. **클라이언트·커밋 금지** |
| `NEXT_PUBLIC_SITE_URL` | 매직링크 리다이렉트 기준 URL |
| `NEXT_PUBLIC_FEEDBACK_URL` | 푸터 피드백 링크(카톡 오픈채팅) |

학기가 바뀌면: `python ../scripts/crawl_hansung_textbooks.py 20271` → `npm run seed:courses 20271` → `npm run covers`

### 이미지 (supabase/002_images.sql 실행 후)
- **교재 표지**: `npm run covers` — `courses.book`을 정규화해 카카오 책 검색으로 표지 URL을 받아 `courses.cover_url`에 저장. `KAKAO_REST_API_KEY` 필요 (없으면 Google Books로 폴백하지만 키 없는 호출은 일일 쿼터가 공유라 거의 실패함).
- **판매자 실물 사진**: 판매 등록 시 최대 3장. 브라우저에서 1280px JPEG로 축소 → Storage `listing-photos/{user_id}/…` 업로드(RLS: 자기 폴더만) → `listings.photos`. 구매 요청엔 사진 없음.

## 3. 구조

```
src/
  proxy.ts                    매 요청 세션 갱신 (Next 16: middleware → proxy)
  lib/supabase/server.ts      서버용 Supabase 클라이언트, getUser()
  lib/events.ts               track(event, props) → events 테이블
  lib/types.ts
  app/
    actions.ts                signIn / signOut / createListing / revealContact / markDone (모두 내부에서 인증 재확인)
    auth/confirm/route.ts     token_hash → 세션 교환
    page.tsx                  검색 (과목명·교수·책) + 최근 매물
    courses/[id]/page.tsx     과목 상세: 지정 교재 + 팔아요/구해요 목록
    listings/new/             등록 폼 (로그인 필요)
    listings/[id]/            상세 + "연락하기" (로그인 필요, contact_clicked 기록)
    my/page.tsx               내 매물, 거래완료 처리
    login/                    매직링크 요청
supabase/schema.sql           테이블·RLS·도메인 제한 트리거·공개 뷰
scripts/seed-courses.ts       카탈로그 CSV 업서트
```

## 4. 계측 (G3)

`events(user_id, event, ts, props)`:
`search` · `login_link_sent` · `login_success` · `listing_created` · **`contact_clicked` (활성화)** · `listing_done`

주간 집계 (Supabase SQL Editor):
```sql
select date_trunc('week', ts)::date as week, event, count(*) as n, count(distinct user_id) as users
from events group by 1, 2 order by 1 desc, 2;
```
가입일·유입경로는 `profiles.signed_up_at`, `profiles.referral_source` (로그인 URL의 `?ref=단톡` 등으로 전달).

## 5. 배포

Vercel에 `app/` 디렉터리를 루트로 연결 → 환경변수 4개 등록(service_role 제외) → Supabase URL Configuration에 배포 도메인 추가.

## 안 만든 것 (의도적)

자체 채팅, 결제, 알림, 리뷰, 다른 학교/학과, 판본 자동 경고 — `02-mvp-scope.md`의 되살릴 조건을 충족할 때까지 만들지 않는다.
