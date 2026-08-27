import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 서버 컴포넌트/서버 액션/라우트 핸들러용. 서버 컴포넌트 렌더 중 set은 무시된다(세션 갱신은 proxy.ts가 담당). */
export async function createClient() {
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
}

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
