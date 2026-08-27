"use client";

/** 루트 레이아웃 자체가 실패했을 때의 최후 경계. 스타일 시트가 없을 수 있어 인라인로 최소만. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "64px 20px", textAlign: "center", color: "#191919" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>서비스에 문제가 생겼습니다</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "#666" }}>잠시 후 다시 시도해 주세요. {error.digest ? `(${error.digest})` : ""}</p>
        <button onClick={reset} style={{ marginTop: 24, height: 44, padding: "0 20px", borderRadius: 12, background: "#002c77", color: "#fff", fontWeight: 600, border: 0 }}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
