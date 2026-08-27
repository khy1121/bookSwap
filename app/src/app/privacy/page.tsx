import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "개인정보처리방침 — BookSwap" };

const UPDATED = "2026-08-28";

export default function PrivacyPage() {
  const h = "mt-8 text-[15px] font-bold";
  const p = "mt-2 text-[13px] leading-relaxed text-gray-1";
  const li = "text-[13px] leading-relaxed text-gray-1";
  return (
    <article className="px-4 pt-6 pb-12">
      <h1 className="text-[22px] font-bold tracking-tight">개인정보처리방침</h1>
      <p className="mt-1 text-[12px] text-gray-3">시행일 {UPDATED} · BookSwap (한성대 과목별 중고 교재 거래)</p>
      <p className={p}>
        BookSwap(이하 &ldquo;서비스&rdquo;)은 한성대학교 학생이 만든 비공식 서비스로, 같은 학교 학생끼리 수업 교재를 사고팔 수 있도록 돕습니다.
        서비스는 아래와 같이 최소한의 개인정보만 다루며, 학교나 제3자에게 판매·제공하지 않습니다.
      </p>

      <h2 className={h}>1. 수집하는 정보</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li className={li}><b>학교 이메일 주소</b>(@hansung.ac.kr) — 로그인과 &ldquo;같은 학교 학생&rdquo; 확인용. Google 계정으로 로그인하면 Google이 제공하는 이메일·이름·프로필 사진 중 이메일만 저장합니다.</li>
        <li className={li}><b>거래 글에 직접 입력한 정보</b> — 교재명, 판본, 상태, 희망 가격, 메모, 연락 방법(카카오 오픈채팅 링크 또는 에브리타임 닉네임), 실물 사진.</li>
        <li className={li}><b>채팅 내용</b> — 거래 상대와 주고받은 메시지와 사진.</li>
        <li className={li}><b>이용 기록</b> — 검색어, 거래 등록·완료·삭제, 연락처 열람, 채팅 시작 등 서비스 개선을 위한 이벤트와 시각. 가입일과 유입 경로(예: 학과 단톡, 에브리타임).</li>
      </ul>
      <p className={p}>전화번호·주민등록번호·주소·결제 정보는 수집하지 않으며, 연락 방법 칸에 전화번호나 이메일을 넣으면 등록이 거부됩니다.</p>

      <h2 className={h}>2. 이용 목적</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li className={li}>한성대 학생임을 확인하고 로그인 상태를 유지하기 위해</li>
        <li className={li}>거래 글을 다른 학생에게 보여주고, 로그인한 학생에게만 연락처·채팅을 열기 위해</li>
        <li className={li}>어떤 수업·교재에 수요가 있는지 파악해 서비스를 개선하기 위해 (개인을 식별하지 않는 집계)</li>
      </ul>

      <h2 className={h}>3. 보관 기간</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li className={li}>거래 글·사진: 사용자가 삭제할 때까지. 삭제 시 사진 파일도 함께 지웁니다.</li>
        <li className={li}>채팅: 거래 글이 삭제되면 함께 삭제됩니다.</li>
        <li className={li}>계정: 탈퇴 요청 시 즉시 삭제하며, 계정에 연결된 거래 글·채팅도 함께 삭제됩니다.</li>
        <li className={li}>이용 기록: 최대 1년 보관 후 삭제하거나 개인을 식별할 수 없게 처리합니다.</li>
      </ul>

      <h2 className={h}>4. 제3자 제공 및 처리 위탁</h2>
      <p className={p}>개인정보를 제3자에게 판매하거나 제공하지 않습니다. 서비스 운영을 위해 아래 사업자의 인프라를 이용하며, 각 사업자는 자체 개인정보처리방침에 따라 데이터를 처리합니다.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li className={li}><b>Supabase</b> — 데이터베이스, 로그인, 파일 저장, 실시간 채팅</li>
        <li className={li}><b>Vercel</b> — 웹 호스팅</li>
        <li className={li}><b>Google</b> — 학교 Google 계정 로그인 (Google 로그인을 선택한 경우)</li>
        <li className={li}><b>Kakao</b> — 교재 표지 이미지 검색 (개인정보는 전송하지 않음)</li>
      </ul>

      <h2 className={h}>5. 이용자의 권리</h2>
      <p className={p}>
        언제든지 자신의 거래 글을 수정·삭제할 수 있고, 계정 삭제(탈퇴)와 보유 정보 열람을 요청할 수 있습니다.
        요청은 아래 연락처로 보내주시면 7일 안에 처리합니다.
      </p>

      <h2 className={h}>6. 안전 조치</h2>
      <p className={p}>
        연락처와 채팅은 로그인한 한성대 학생에게만 열리며, 데이터베이스 접근 권한 규칙(RLS)으로 본인 거래만 수정·삭제할 수 있게 제한합니다.
        모든 통신은 HTTPS로 암호화됩니다.
      </p>

      <h2 className={h}>7. 문의</h2>
      <p className={p}>
        개인정보 관련 문의·삭제 요청: <a className="text-action underline" href="mailto:rlagjsdud3@hansung.ac.kr">rlagjsdud3@hansung.ac.kr</a> 또는{" "}
        <a className="text-action underline" href="https://open.kakao.com/o/sfnqXPKi" target="_blank" rel="noreferrer">카카오 오픈채팅</a>
      </p>
      <p className={p}>이 방침은 변경될 수 있으며, 변경 시 이 페이지에 시행일과 함께 게시합니다.</p>

      <p className="mt-10 text-[12px]"><Link href="/" className="text-action underline">← 홈으로</Link></p>
    </article>
  );
}
