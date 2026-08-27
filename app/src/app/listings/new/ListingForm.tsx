"use client";

import { useActionState, useRef, useState } from "react";
import { createListing, type ActionState } from "@/app/actions";
import { CONDITIONS, KIND_BG, KIND_LABEL } from "@/lib/types";
import { shrinkImage } from "@/lib/image";

const MAX_PHOTOS = 3;

export function ListingForm({
  courseId,
  defaultKind,
  defaultTitle,
}: {
  courseId: string;
  defaultKind: "sell" | "buy";
  defaultTitle: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createListing, {});
  const [kind, setKind] = useState<"sell" | "buy">(defaultKind);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const field = "mt-1.5 h-12 w-full rounded-lg border border-line bg-white px-3 text-[15px] outline-none focus:border-action";
  const label = "block text-[13px] font-medium text-gray-1";

  async function addPhotos(list: FileList | null) {
    if (!list) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(list).slice(0, room);
    try {
      const shrunk = await Promise.all(picked.map((f) => shrinkImage(f)));
      setPhotos((p) => [...p, ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "사진을 불러오지 못했습니다.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, j) => j !== i);
    });
  }

  // 축소된 파일을 FormData에 직접 실어 보낸다 (원본 input은 name 없음)
  function submit(fd: FormData) {
    fd.delete("photos");
    if (kind === "sell") photos.forEach((p) => fd.append("photos", p.file, p.file.name));
    return action(fd);
  }

  return (
    <form action={submit} className="px-4 pt-4">
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="kind" value={kind} />

      <div className="grid grid-cols-2 gap-2">
        {(["buy", "sell"] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setKind(k)}
            className={`h-11 rounded-lg border text-[14px] font-bold ${
              kind === k ? `${KIND_BG[k]} border-transparent text-white` : "border-line bg-white text-gray-2"
            }`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {kind === "sell" && (
          <div>
            <span className={label}>
              실물 사진 <span className="font-normal text-gray-3">(선택, 최대 {MAX_PHOTOS}장)</span>
            </span>
            <div className="mt-1.5 flex gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="사진 삭제"
                    className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/60 text-[11px] leading-5 text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-line text-gray-3"
                >
                  <span className="text-xl leading-none">+</span>
                  <span className="mt-1 text-[11px]">{photos.length}/{MAX_PHOTOS}</span>
                </button>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
            <p className="mt-1 text-[11px] text-gray-3">표지·필기 상태가 보이게 찍으면 거래가 빨라집니다. 이름이 적힌 면은 피하세요.</p>
            {photoError && <p className="mt-1 text-[12px] text-red-600">{photoError}</p>}
          </div>
        )}

        <label className={label}>
          교재명
          <input name="book_title" required defaultValue={defaultTitle} className={field} placeholder="책 제목 — 여러 권이면 한 권씩" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            판본
            <input name="edition" className={field} placeholder="개정5판" />
          </label>
          <label className={label}>
            {kind === "buy" ? "최대 얼마까지" : "얼마에"}
            <input name="price" inputMode="numeric" className={field} placeholder="12000" />
          </label>
        </div>

        {kind === "sell" && (
          <label className={label}>
            상태
            <select name="condition" className={field} defaultValue="">
              <option value="">선택 안 함</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}

        <label className={label}>
          연락 방법
          <input name="contact" required className={field} placeholder="카톡 오픈채팅 링크 또는 에타 닉네임" />
          <span className="mt-1 block text-[11px] font-normal text-gray-3">로그인한 한성대 학생에게만 보입니다</span>
        </label>

        <label className={label}>
          메모 <span className="font-normal text-gray-3">(선택)</span>
          <textarea name="note" rows={2} className={`${field} h-auto py-3`} placeholder="직거래 장소, 필기 정도 등" />
        </label>
      </div>

      {state.error && <p className="mt-3 text-[13px] text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className={`mt-6 h-12 w-full rounded-lg text-[15px] font-bold text-white disabled:opacity-60 ${KIND_BG[kind]}`}
      >
        {pending ? "올리는 중…" : `${KIND_LABEL[kind]} 올리기`}
      </button>
    </form>
  );
}
