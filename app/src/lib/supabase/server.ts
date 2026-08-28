import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/** 서버 컴포넌트/서버 액션/라우트 핸들러용. 서버 컴포넌트 렌더 중 set은 무시된다(세션 갱신은 proxy.ts가 담당). */
/** 같은 요청 안에서는 한 번만 만든다 (레이아웃·페이지·track이 공유) */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* Server Component 렌더 중에는 쿠키를 쓸 수 없음 */
          }
        },
      },
    },
  );
});

/** 요청당 1회만 Auth 서버에 묻는다 (레이아웃·페이지·액션이 각각 부르던 왕복을 합침) */
export const getUser = cache(async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});
