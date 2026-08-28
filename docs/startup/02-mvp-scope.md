# G2. MVP 스코프 — L0~L2 통과 후에만 착수

## 결정표

| 기능 | 통 | 근거 | 되살릴 조건 |
|---|---|---|---|
| 과목/교수 기준 교재 등록·검색 | **build** | 문제의 핵심. 경쟁자가 놓친 단 하나의 지점 | - |
| 학교 이메일(@hansung.ac.kr) 인증 로그인 | **build** | 포기 불가 항목(인증/권한). 같은 학교 보장이 신뢰의 근거 | - |
| 매수자→판매자 연락 (카톡 오픈채팅 링크 노출) | **build** | 거래 성사의 필수 경로. 자체 채팅 대신 링크 | - |
| 과목·지정교재 카탈로그 | manual→**스크립트** | `scripts/crawl_hansung_textbooks.py`로 학기마다 1회 실행 (2026-08-27 확보, 538 과목·교수 조합) | 학기 시작 전 재실행 |
| 자체 채팅 | ~~제외~~ → **build** (2026-08-27 사용자 결정, PR #13) | 1:1 텍스트+사진, Realtime, 안 읽음 배지. 푸시·읽음표시·차단 없음 | 되살릴 조건 없이 선반영 — 사용률은 `chat_started`/`chat_message` 이벤트로 관측 |
| 안전결제/에스크로 | 제외 | 직거래(교내) 전제 | 사기 신고 1건 발생 시 재검토 |
| 판본 불일치 경고 | fake | 카탈로그의 주교재·판본과 매물 비교해 "교수 지정 교재와 일치" 뱃지. 초기엔 내가 수동 확인 | 헛구매 신고 3건 (카탈로그 확보로 build 승격 비용↓) |
| 가격 추천 | 제외 | 데이터 없음 | 거래 50건 누적 |
| 알림(새 매물 등록 시) | fake | 관심 과목 저장만 받고, 매물 등록되면 내가 카톡으로 알려줌 | 하루 1시간 초과 |
| 다른 학교/학과 | 제외 | 좁고 깊게 | 타 학과 학생 문의 10건 |
| 리뷰/평판 | 제외 | 초기엔 학교 이메일 인증으로 대체 | 거래 100건 |

build 통: **3개** ✓

## 포기 불가 6항목 처리
| 항목 | 방법 |
|---|---|
| 데이터 유실 방지 | 관리형 DB 자동 백업 |
| 인증/권한 | BaaS 매직링크(학교 도메인 제한) |
| 결제 정확성 | 해당 없음(결제 없음) |
| 개인정보 최소화 | 이메일 + 카톡 오픈채팅 링크만. 전화번호·실명 수집 안 함 |
| 에러 로깅 | 관리형 에러 추적 1개 |
| 접근성 기본 | 시맨틱 HTML, 폼 라벨 |

## 스택 (확정 2026-08-27)
| 영역 | 후보 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js (App Router) + TypeScript** 단일 언어 풀스택 | React/TS 익숙함. Java 백엔드 병행 안 함(두 언어 유지 비용 제거). 서버 로직은 Route Handler / Server Actions |
| 백엔드/DB/인증 | Supabase (Postgres + Auth 매직링크) | 도메인 제한 인증 내장 |
| 배포 | Vercel | push = 배포 |
| 에러 추적 | Sentry 무료 | |
| 비동기 | 없음. 알림은 manual | |

## 6주 타임박스
| 주 | 목표 |
|---|---|
| 1 | 스키마(과목, 교재, 매물, 사용자) + 학교 이메일 로그인 |
| 2 | 매물 등록/검색(과목 기준) |
| 3 | 연락 링크 + G3 계측 이벤트 |
| 4 | 카탈로그 CSV 임포트, 초기 10인 온보딩 |
| 5 | 소프트 론칭(학과 단톡 1곳) |
| 6 | 버퍼 |

## G3 계측 (구현 계획에 태스크로 포함)
- 이벤트 테이블: `user_id, event, ts, props`
- **활성화 이벤트 1개: `contact_clicked`** (매수자가 판매자 연락 링크를 누름)
- 사용자 테이블에 `signed_up_at`, `referral_source` (단톡/에브리타임/직접) 필수
- 주간 집계 스크립트: 신규 매물 수, 검색 수, contact_clicked 수, 성사 건수(수동 확인)
- 피드백 채널: 서비스 하단 카톡 오픈채팅 링크 1개 → 내 폰
- 에러 알림에 `user_id` 부착


## 구현 현황 (2026-08-27)
| 항목 | 상태 |
|---|---|
| 스캐폴딩 (`app/`, Next.js 16 + TS + Tailwind + Supabase SSR) | ✅ |
| 스키마·RLS·도메인 트리거 (`app/supabase/schema.sql`) | ✅ 작성 — Supabase 프로젝트에 실행 필요 |
| build 1: 과목 검색 / 과목 상세(지정 교재) / 매물 등록 | ✅ |
| build 2: `@hansung.ac.kr` 매직링크 로그인 | ✅ 코드 — Supabase 이메일 템플릿·URL 설정 필요 (README §1) |
| build 3: 연락처 노출 + `contact_clicked` | ✅ |
| G3 계측: events 테이블, 활성화 이벤트, 가입일·유입경로, 주간 SQL | ✅ (`?ref=` 파라미터로 유입경로 전달) |
| 카탈로그 시드 (`npm run seed:courses`) | ✅ 1,436행 적재 |
| 교재 표지 (`npm run covers`, 카카오 책 검색) | ✅ 2026-08-27 — 391 고유 교재명 중 162 매칭. 사람 눈으로 전수 감사(`docs/startup/cover-audit.md`) 후 규칙 보강: 『』 안 제목 우선, 3글자 이름 세그먼트 건너뜀, TBA/pdf/강의노트 등 금지어, 한/영 동의어 질의 병합, 토큰 일치 ≥75% + 짧은 질의는 거의 완전일치. 재실행: `npm run covers -- --reset` |
| 판매자 실물 사진 (Storage `listing-photos`, 최대 3장) | ✅ 코드·버킷·RLS — **업로드 e2e 미검증** |
| 에러 알림(Sentry) | ⏳ 미설정 |
| 학교 Google 계정 로그인 (PR #16, 개인정보처리방침 #17) | ✅ 2026-08-28 로컬 e2e 성공. 한성대 메일 = Google Workspace → OAuth hd=hansung.ac.kr + DB 트리거 이중 검사. 프로덕션은 Vercel `NEXT_PUBLIC_GOOGLE_LOGIN=on` 후 표시 |
| 커스텀 SMTP (Brevo 등) | ⏳ Google 로그인이 주 수단이 되어 **보조**로 격하. 메일 링크는 예외용 |
| 피드백 채널 링크 | ⏳ `NEXT_PUBLIC_FEEDBACK_URL`에 오픈채팅 넣기 |
| 배포(Vercel) | ⏳ |

`npm run build` · `npm run lint` · `tsc --noEmit` 통과. **2026-08-27 e2e 검증 완료**: 매직링크 로그인 → 프로필 트리거 → 검색 → 판매/구매 등록 → 즉시가 표시 → 이벤트(login_success, search, listing_created) 기록. 미검증: `contact_clicked`(두 번째 계정 필요), 거래완료 처리.
테스트 중 로그인 링크는 `auth.admin.generateLink`로 생성하면 SMTP 제한을 우회할 수 있음.

## 스코프 밖 추가분 (사용자 결정, 2026-08-27 저녁)
| 기능 | PR | 비고 |
|---|---|---|
| 교재 표지 자동 수집 + 판매자 실물 사진 | 초기 push | 표지 161종·355분반, 사진 e2e 통과 |
| 내 거래 수정·삭제 | #2 | RLS delete 정책(003) 필요 |
| 학과·트랙 카테고리 탐색 `/browse` | #3 | 분반별 소속 학과 전체 저장(004), 컴퓨터공학부 101분반 |

배포: https://book-swap-virid.vercel.app (Vercel, Root=app, `vercel.json` framework=nextjs). main 보호 + `verify` 필수 체크.

## 예외 처리 (PR #8)
- 경계: `app/error.tsx`(다시 시도/홈), `not-found.tsx`, `global-error.tsx`. 페이지 조회는 `must()`로 실패를 삼키지 않고 경계로 올림
- 서버 액션: 입력 한도(`lib/errors.ts` LIMITS — 제목 100자, 판본 30, 연락 200, 메모 500, 가격 ≤100만, 사진 3장·3MB, 진행 중 거래 30개), 연락처는 오픈채팅 링크 또는 에타 닉만(전화·이메일 거부), course_id UUID 검증, 완료된 거래 연락처 조회 거부
- Supabase/Auth/Storage 오류 → `toMessage()`로 한국어 변환, 원문은 서버 로그. 삭제/완료 실패는 `?toast=error|forbidden`
- 이미지: HEIC/손상 파일 안내, 25MB 원본 제한, 표지·사진 로드 실패 시 플레이스홀더 폴백
- 프록시: env 누락·세션 갱신 실패 시에도 페이지는 렌더
- 알려진 것: `loading.tsx` 스트리밍 때문에 notFound() 페이지가 HTTP 200으로 내려감(UI는 404 화면). SEO 필요해지면 loading 제거 또는 존재 확인 선행

## 채팅 (PR #13)
- `supabase/005_chat.sql`: chat_rooms(매물×구매자 unique), chat_messages(body≤500 또는 image_url), RLS(참여자만), Realtime 발행, `chat-photos` 버킷(참여자만 업로드), `my_chat_rooms()`/`my_unread_count()` RPC
- 서버 액션 `chats/actions.ts`: openChat(판매자 본인·완료 거래 거부) / sendMessage(분당 20건, 사진 3MB) / markRead
- `ChatRoom.tsx`: 브라우저 Supabase 클라이언트로 postgres_changes 구독 + 끊기면 15초 폴링, 사진은 클라이언트 축소 후 전송
- 매물 상세: "○○와 채팅하기"가 주 버튼, 오픈채팅·에타 연락처는 보조
- 이벤트: chat_started, chat_message(has_image). 활성화 지표를 contact_clicked → chat_started로 바꿀지는 9/10 판정 때 결정
- e2e (2026-08-27, PR #14): 테스트 계정으로 방 생성 → 텍스트·사진 전송 → 판매자 브라우저에서 수신·배지·답장 → 구매자 실시간 수신 PASS, 읽음 처리 PASS. 발견·수정: Realtime 구독 전 세션 토큰 필요, 렌더 중 revalidatePath 금지

## PWA · 모바일 앱 규격 (PR #22)
- `app/manifest.ts`(standalone, 아이콘 192/512/maskable, start_url `/?ref=pwa`로 설치 유입 계측), iOS 메타(apple-touch-icon, web-app-capable), viewport-fit=cover
- 모바일(<640px): 헤더는 로고+로그아웃만, **하단 탭바**(홈·학과·채팅·내 거래, 채팅 배지). 자체 하단 바가 있는 화면(과목·매물 상세, 등록/수정, 채팅방)에선 탭바 숨김
- PWA는 레이아웃을 보정하지 않음 — safe-area는 `.bottom-bar`(env(safe-area-inset-bottom))가 처리. 서비스워커는 넣지 않음(오프라인 불필요, Chrome 설치엔 매니페스트만으로 충분)
- 설치 안내(PR #23): `InstallPrompt` — Android는 beforeinstallprompt로 즉시 설치, iOS는 '공유→홈 화면에 추가' 3단계 시트, 인앱 브라우저(카톡·인스타·에타 앱)는 외부 브라우저로 열기 안내. standalone이면 미표시, 닫으면 7일 숨김. 이벤트: pwa_prompt_shown/dismissed, pwa_install_choice(outcome), pwa_installed, pwa_guide_shown. 미리보기 `?pwa=android|ios|inapp`
- iOS PWA는 Safari와 쿠키를 공유하지 않아 로그아웃 상태로 열림(PR #24로 대응): 탭바를 항상 표시하고 로그아웃 시 '내 거래'→'로그인', 채팅 탭은 로그인으로 유도, 모바일 헤더에 로그인 링크. 설치 후 앱 안에서 Google 로그인 1회 필요
