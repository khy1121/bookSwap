# 배포 게이트 설정 (한 번만)

## GitHub
1. 레포 루트 = `C:\startUp` (app/ · docs/ · scripts/ · data/). `main` 브랜치에 push
2. **Settings → Branches → Add branch protection rule**
   - Branch name pattern: `main`
   - ☑ Require a pull request before merging
   - ☑ Require status checks to pass before merging → 검색해서 **`verify`** 추가
   - ☑ Do not allow bypassing the above settings (혼자여도 켜두면 실수 방지)

## Vercel
1. Add New Project → GitHub 레포 import → **Root Directory: `app`** (반드시 지정)
2. Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = 배포 도메인 (예: https://bookswap-hansung.vercel.app)
   - `NEXT_PUBLIC_FEEDBACK_URL`
   - ⚠ `SUPABASE_SERVICE_ROLE_KEY`, `KAKAO_REST_API_KEY`는 **넣지 않는다** (로컬 스크립트 전용)
3. Settings → Git → Production Branch: `main`
4. (선택) Settings → Deployment Protection → Vercel Authentication 켜면 프리뷰 URL은 팀만 열람

## Supabase
- Authentication → URL Configuration
  - Site URL: 배포 도메인
  - Redirect URLs: `https://<도메인>/auth/confirm`, `https://*-<vercel-team>.vercel.app/auth/confirm` (프리뷰용)

## 흐름
```
브랜치 push → PR → Actions verify(lint·tsc·build)
   ❌ → merge 불가 → 프로덕션 변화 없음 (프리뷰 URL은 뜸)
   ✅ → merge → Vercel이 main 빌드 → 프로덕션
```
빌드 자체가 실패해도 Vercel은 이전 배포를 유지한다.
