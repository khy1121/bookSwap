/** 브라우저에서 이미지를 최대 변 1280px, JPEG 0.82로 축소한다. 업로드 용량을 줄이고 EXIF도 제거된다. */
export async function shrinkImage(file: File, max = 1280, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");
  if (file.size > 25 * 1024 * 1024) throw new Error("원본이 25MB를 넘습니다. 더 작은 사진을 골라주세요.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(/hei[cf]/i.test(file.type + file.name) ? "HEIC 사진은 지원하지 않습니다. JPG로 바꿔 올려주세요." : "사진을 읽을 수 없습니다. 다른 파일을 골라주세요.");
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("이미지 변환에 실패했습니다.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
