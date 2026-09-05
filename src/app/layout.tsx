import type { Metadata } from "next";
import "./globals.css";
import { AudioProvider } from "@/context/AudioContext";

export const metadata: Metadata = {
  title: "SoundFetch - Trình Tải Nhạc Đa Nguồn Chất Lượng Cao (320kbps / Lossless)",
  description: "Tải nhạc miễn phí từ YouTube, SoundCloud, Zing MP3, Spotify, TikTok... Nhanh chóng, an toàn, hỗ trợ mọi thiết bị di động, máy tính bảng và máy tính.",
  keywords: ["tải nhạc", "download mp3", "youtube to mp3", "soundcloud downloader", "zing mp3 downloader", "nhạc 320kbps", "soundfetch"],
  authors: [{ name: "SoundFetch Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AudioProvider>
          <div className="main-wrapper">{children}</div>
        </AudioProvider>
      </body>
    </html>
  );
}

