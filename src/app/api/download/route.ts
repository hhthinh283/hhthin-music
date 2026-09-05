import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFileAsync, getYtDlpPath, getDownloadsDir } from "@/lib/ytDlp";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, title, thumbnail, format = "mp3", quality = "320kbps" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Thiếu liên kết bài hát." },
        { status: 400 }
      );
    }

    const ytDlpPath = await getYtDlpPath();
    const downloadsDir = getDownloadsDir();

    const rawTitle = title || "Audio_Track";
    // Preserve full Vietnamese & Unicode characters, strip illegal OS filename characters (\ / : * ? " < > | ｜ ／ ： ？)
    let cleanFolderTitle = rawTitle
      .replace(/[\\/:*?"<>|\r\n\t｜／：？"＜＞]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Audio_Track";

    // Truncate folder title if too long to prevent Windows MAX_PATH limits
    if (cleanFolderTitle.length > 100) {
      cleanFolderTitle = cleanFolderTitle.slice(0, 100).trim();
    }

    // Create a dedicated folder for this track: public/downloads/[cleanFolderTitle]/
    const trackDir = path.join(/*turbopackIgnore: true*/ downloadsDir, cleanFolderTitle);
    if (!fs.existsSync(trackDir)) {
      fs.mkdirSync(trackDir, { recursive: true });
    }

    // Save thumbnail image as cover.jpg inside the track folder
    let hasThumb = false;
    if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("http")) {
      try {
        const thumbFilePath = path.join(/*turbopackIgnore: true*/ trackDir, "cover.jpg");
        const thumbRes = await fetch(thumbnail);
        if (thumbRes.ok) {
          const arrayBuf = await thumbRes.arrayBuffer();
          fs.writeFileSync(thumbFilePath, Buffer.from(arrayBuf));
          hasThumb = true;
        }
      } catch (err) {
        console.error("Lỗi tải ảnh bìa bài hát vào thư mục:", err);
      }
    }

    // Use fixed output template 'audio.%(ext)s' to prevent yt-dlp percent % template parsing errors
    const outputTemplate = path.join(/*turbopackIgnore: true*/ trackDir, "audio.%(ext)s");

    let downloadError: any = null;
    try {
      await execFileAsync(
        ytDlpPath,
        [
          "--extractor-args",
          "youtube:player_client=ios,android,mweb",
          "-o",
          outputTemplate,
          "-f",
          "ba/ba*",
          "--no-playlist",
          "--no-warnings",
          url,
        ],
        { encoding: "utf-8" }
      );
    } catch (err: any) {
      console.warn("yt-dlp download execution warning:", err?.message || err);
      downloadError = err;
    }

    // Dynamically check if the audio file exists inside the track folder
    const downloadedFiles = fs.existsSync(trackDir)
      ? fs.readdirSync(trackDir)
      : [];
    const actualAudioFile = downloadedFiles.find(
      (f) =>
        !f.startsWith(".") &&
        f !== "cover.jpg" &&
        !f.endsWith(".part") &&
        !f.endsWith(".ytdl")
    );

    if (actualAudioFile) {
      const actualAudioPath = path.join(/*turbopackIgnore: true*/ trackDir, actualAudioFile);
      const fileStat = fs.statSync(actualAudioPath);

      if (fileStat.size > 0) {
        const fileUrl = `/downloads/${encodeURIComponent(cleanFolderTitle)}/${encodeURIComponent(actualAudioFile)}`;
        const thumbUrl = hasThumb ? `/downloads/${encodeURIComponent(cleanFolderTitle)}/cover.jpg` : "";

        return NextResponse.json({
          success: true,
          message: `Đã lưu bài hát và ảnh bìa vào thư mục public/downloads/${cleanFolderTitle}/`,
          folderName: cleanFolderTitle,
          fileName: cleanFolderTitle, // used by library for deleting folder
          audioFileName: actualAudioFile,
          fileUrl,
          thumbUrl,
          localPath: actualAudioPath,
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Không thể lưu file nhạc vào thư mục downloads.",
        details: downloadError?.message,
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("Silent download top-level error:", err);
    return NextResponse.json(
      { success: false, error: "Đã xảy ra lỗi khi xử lý tải nhạc." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const title = searchParams.get("title") || "Audio_Track";
  const format = searchParams.get("format") || "mp3";
  const quality = searchParams.get("quality") || "320kbps";

  if (!url) {
    return NextResponse.json({ success: false, error: "Missing URL parameter" }, { status: 400 });
  }

  return POST(
    new Request("http://localhost/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, title, format, quality }),
    })
  );
}
