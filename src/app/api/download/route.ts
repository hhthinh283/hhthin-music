import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execFileAsync, getYtDlpPath, getDownloadsDir, getFfmpegLocation } from "@/lib/ytDlp";

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

    // Save highest quality thumbnail image as cover.jpg inside the track folder
    let hasThumb = false;
    if (thumbnail && typeof thumbnail === "string" && thumbnail.startsWith("http")) {
      try {
        const thumbFilePath = path.join(/*turbopackIgnore: true*/ trackDir, "cover.jpg");

        // Candidate URLs prioritized by maximum resolution
        const candidateUrls: string[] = [];

        // Check if YouTube link / thumbnail
        const ytIdMatch =
          thumbnail.match(/\/vi\/([a-zA-Z0-9_-]{11})\//) ||
          url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/);

        if (ytIdMatch && ytIdMatch[1]) {
          const vid = ytIdMatch[1];
          // 1280x720 HD MaxRes
          candidateUrls.push(`https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`);
          // 640x480 Standard Def
          candidateUrls.push(`https://i.ytimg.com/vi/${vid}/sddefault.jpg`);
          // 480x360 High Quality
          candidateUrls.push(`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`);
        }

        // SoundCloud 500x500 master artwork
        if (thumbnail.includes("sndcdn.com")) {
          candidateUrls.push(
            thumbnail.replace(/-large\./, "-t500x500.").replace(/-badge\./, "-t500x500.")
          );
          candidateUrls.push(thumbnail.replace(/-large\./, "-original."));
        }

        candidateUrls.push(thumbnail);

        // Try downloading the highest resolution available (checking byteLength > 2000 to prevent 1x1 error placeholders)
        for (const candidate of candidateUrls) {
          try {
            const thumbRes = await fetch(candidate, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });
            if (thumbRes.ok) {
              const arrayBuf = await thumbRes.arrayBuffer();
              if (arrayBuf.byteLength > 2000) {
                fs.writeFileSync(thumbFilePath, Buffer.from(arrayBuf));
                hasThumb = true;
                break;
              }
            }
          } catch {
            // try next candidate
          }
        }
      } catch (err) {
        console.error("Lỗi tải ảnh bìa bài hát vào thư mục:", err);
      }
    }

    // Use fixed output template 'audio.%(ext)s' to prevent yt-dlp percent % template parsing errors
    const outputTemplate = path.join(/*turbopackIgnore: true*/ trackDir, "audio.%(ext)s");

    const targetFormat =
      format && ["mp3", "m4a", "flac", "wav"].includes(format.toLowerCase())
        ? format.toLowerCase()
        : "mp3";

    const ffmpegLoc = getFfmpegLocation();
    const ytArgs: string[] = [
      "-o",
      outputTemplate,
      "--no-playlist",
      "--no-warnings",
    ];

    if (ffmpegLoc) {
      ytArgs.push("--ffmpeg-location", ffmpegLoc);
      ytArgs.push("-x"); // Extract audio only, discarding all video streams
      ytArgs.push("--audio-format", targetFormat);
      ytArgs.push("--audio-quality", "0"); // 0 = best VBR quality (~250-320kbps)
      // Strictly audio-only format selector: enforces vcodec=none
      ytArgs.push("-f", "bestaudio[vcodec=none]/ba[vcodec=none]/bestaudio/ba");
    } else {
      // Without ffmpeg, strictly select audio stream with vcodec=none (audio only, no video fallback)
      ytArgs.push("-f", "bestaudio[vcodec=none]/ba[vcodec=none]/bestaudio/ba");
    }

    ytArgs.push(url);

    let downloadError: any = null;
    try {
      await execFileAsync(ytDlpPath, ytArgs, { encoding: "utf-8" });
    } catch (err: any) {
      console.warn("yt-dlp download execution warning:", err?.message || err);
      downloadError = err;
    }

    // Anti-Video Guard: check if any video container was mistakenly downloaded
    const VALID_AUDIO_EXTS = [".mp3", ".m4a", ".webm", ".opus", ".flac", ".wav", ".aac", ".ogg"];
    const VIDEO_EXTS = [".mp4", ".mkv", ".avi", ".mov", ".flv", ".wmv"];

    const currentFiles = fs.existsSync(trackDir) ? fs.readdirSync(trackDir) : [];

    for (const file of currentFiles) {
      const ext = path.extname(file).toLowerCase();
      if (VIDEO_EXTS.includes(ext)) {
        const fullVidPath = path.join(trackDir, file);
        if (ffmpegLoc) {
          try {
            const ffmpegBin = path.join(
              ffmpegLoc,
              process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
            );
            const convertedAudioPath = path.join(trackDir, `audio.${targetFormat}`);
            // Strip video completely (-vn) and export pure audio stream
            await execFileAsync(ffmpegBin, [
              "-i",
              fullVidPath,
              "-vn",
              "-c:a",
              targetFormat === "mp3" ? "libmp3lame" : "copy",
              "-q:a",
              "2",
              "-y",
              convertedAudioPath,
            ]);
            // Remove video file immediately after audio extraction
            if (fs.existsSync(convertedAudioPath) && fs.statSync(convertedAudioPath).size > 0) {
              fs.unlinkSync(fullVidPath);
            }
          } catch (e) {
            console.error("Failed to strip video stream:", e);
            try {
              fs.unlinkSync(fullVidPath);
            } catch {}
          }
        } else {
          // If ffmpeg is not available, delete any video file immediately
          try {
            fs.unlinkSync(fullVidPath);
          } catch {}
        }
      }
    }

    // Dynamically check if a valid pure audio file exists inside the track folder
    const postFiles = fs.existsSync(trackDir) ? fs.readdirSync(trackDir) : [];
    const actualAudioFile = postFiles.find(
      (f) =>
        !f.startsWith(".") &&
        f !== "cover.jpg" &&
        !f.endsWith(".part") &&
        !f.endsWith(".ytdl") &&
        VALID_AUDIO_EXTS.includes(path.extname(f).toLowerCase())
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
