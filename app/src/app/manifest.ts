import type { MetadataRoute } from "next";

/** PWA 매니페스트 — /manifest.webmanifest 로 서빙된다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BookSwap — 한성대 과목별 중고 교재",
    short_name: "BookSwap",
    description: "한성대 과목·교수 기준으로 중고 교재를 사고팝니다.",
    start_url: "/?ref=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a4da1",
    lang: "ko",
    categories: ["education", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
