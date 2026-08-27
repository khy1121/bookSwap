"use client";

import { useActionState, useRef, useState } from "react";
import { createListing, updateListing, type ActionState } from "@/app/actions";
import { CONDITIONS, KIND_BG, KIND_LABEL } from "@/lib/types";
import { shrinkImage } from "@/lib/image";

const MAX_PHOTOS = 3;

export type ListingInitial = {
  id: string;
  kind: "sell" | "buy";
  book_title: string;
  edition: string | null;
  condition: string | null;
  price: number | null;
  contact: string;
  note: string | null;
  photos: string[];
};

export function ListingForm({
  courseId,
  defaultKind,
  defaultTitle,
  initial,
}: {
  courseId: string;
  defaultKind: "sell" | "buy";
  defaultTitle: string;
  /** 있으면 수정 모드 */
  initial?: ListingInitial;
}) {
  const boundAction = initial ? updateListing.bind(null, initial.id) : createListing;
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, {});
  const [kind, setKind] = useState<"sell" | "buy">(initial?.kind ?? defaultKind);
  const [kept, setKept] = useState<string[]>(initial?.photos ?? []);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const field = "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none transition-[border-color,box-shadow] focus:border-action focus:shadow-[0_0_0_3px_rgba(0,100,239,0.12)]";
  const label = "block text-[13px] font-medium text-gray-1";
  const total = kept.length + photos.length;

  async function addPhotos(list: FileList | null) {
    if (!list) return;
    setPhotoError(null);
    const picked = Array.from(list).slice(0, MAX_PHOTOS - total);
    try {
      const shrunk = await Promise.all(picked.map((f) => shrinkImage(f)));
      setPhotos((p) => [...p, ...shrunk.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "사진을 불러오지 못했습니다.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeNew(i: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, j) => j !== i);
    });
  }

  function submit(fd: FormData) {
    fd.delete("photos");
    if (kind === "sell") photos.forEach((p) => fd.append("photos", p.file, p.file.name));
    fd.set("keep_photos", JSON.stringify(kind === "sell" ? kept : []));
    return action(fd);
  }

  const thumb = (src: string, onRemove: () => void, key: string) => (
    <div key={key} className="anim-fade-up relative h-20 w-20 overflow-hidden rounded-xl border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={onRemove} aria-label="사진 삭제"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><span aria-hidden className="icon-[lucide--x] size-3" /></button>
    </div>
  );

  return (
    <form action={submit} className="px-4 pt-4">
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="kind" value={kind} />

      <div className="grid grid-cols-2 gap-2">
        {(["buy", "sell"] as const).map((k) => (
          <button type="button" key={k} onClick={() => setKind(k)}
            className={`press h-11 rounded-xl border text-[14px] font-bold ${
              kind === k ? `${KIND_BG[k]} border-transparent text-white` : "border-line bg-white text-gray-2"
            }`}>
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
              {kept.map((u) => thumb(u, () => setKept((k) => k.filter((x) => x !== u)), u))}
              {photos.map((p, i) => thumb(p.url, () => removeNew(i), p.url))}
              {total < MAX_PHOTOS && (
                <button type="button" onClick={() => fileInput.current?.click()}
                  className="press flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-line text-gray-3 hover:border-action hover:text-action">
                  <span aria-hidden className="icon-[lucide--image-plus] size-6" />
                  <span className="mt-1 text-[11px]">{total}/{MAX_PHOTOS}</span>
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
          <input name="book_title" required maxLength={100} defaultValue={initial?.book_title ?? defaultTitle} className={field} placeholder="책 제목 — 여러 권이면 한 권씩" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            판본
            <input name="edition" maxLength={30} defaultValue={initial?.edition ?? ""} className={field} placeholder="개정5판" />
          </label>
          <label className={label}>
            {kind === "buy" ? "최대 얼마까지" : "얼마에"}
            <input name="price" inputMode="numeric" maxLength={9} defaultValue={initial?.price ?? ""} className={field} placeholder="12000" />
          </label>
        </div>

        {kind === "sell" && (
          <label className={label}>
            상태
            <select name="condition" className={field} defaultValue={initial?.condition ?? ""}>
              <option value="">선택 안 함</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}

        <label className={label}>
          연락 방법
          <input name="contact" required maxLength={200} defaultValue={initial?.contact ?? ""} className={field} placeholder="https://open.kakao.com/… 또는 에타 닉네임" />
          <span className="mt-1 block text-[11px] font-normal text-gray-3">로그인한 한성대 학생에게만 보입니다. 전화번호·이메일은 넣지 마세요.</span>
        </label>

        <label className={label}>
          메모 <span className="font-normal text-gray-3">(선택)</span>
          <textarea name="note" rows={2} maxLength={500} defaultValue={initial?.note ?? ""} className={`${field} h-auto py-3`} placeholder="직거래 장소, 필기 정도 등" />
        </label>
      </div>

      {state.error && <p className="mt-3 text-[13px] text-red-600">{state.error}</p>}
      <button disabled={pending}
        className={`press mt-6 h-12 w-full rounded-xl text-[15px] font-bold text-white disabled:opacity-60 ${KIND_BG[kind]}`}>
        {pending ? (initial ? "저장 중…" : "올리는 중…") : initial ? "저장" : `${KIND_LABEL[kind]} 올리기`}
      </button>
    </form>
  );
}
