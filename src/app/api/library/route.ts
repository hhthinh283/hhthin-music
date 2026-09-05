import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface LibraryTrack {
  id: string;
  fileName: string;
  title: string;
  thumbnail: string;
  url: string;
  sizeMB: string;
  updatedAt: string;
  format: string;
}

export async function GET() {
  try {
    const downloadsDir = path.join(process.cwd(), "public", "downloads");

    if (!fs.existsSync(downloadsDir)) {
      return NextResponse.json({ success: true, tracks: [] });
    }

    const entries = fs.readdirSync(downloadsDir);
    const tracks: LibraryTrack[] = [];

    for (let idx = 0; idx < entries.length; idx++) {
      const entryName = entries[idx];
      if (entryName.startsWith(".")) continue;

      const entryPath = path.join(downloadsDir, entryName);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        // Track stored in dedicated folder: public/downloads/[entryName]/
        const subFiles = fs.readdirSync(entryPath);
        const audioFile = subFiles.find(
          (f) =>
            !f.startsWith(".") &&
            (f.endsWith(".mp3") ||
              f.endsWith(".m4a") ||
              f.endsWith(".flac") ||
              f.endsWith(".wav") ||
              f.endsWith(".webm"))
        );

        if (audioFile) {
          const audioPath = path.join(entryPath, audioFile);
          const audioStat = fs.statSync(audioPath);
          const sizeMB = (audioStat.size / (1024 * 1024)).toFixed(1) + " MB";
          const ext = path.extname(audioFile).slice(1);

          // Find cover image inside track folder
          const imgFile = subFiles.find(
            (f) =>
              !f.startsWith(".") &&
              (f.endsWith(".jpg") ||
                f.endsWith(".jpeg") ||
                f.endsWith(".png") ||
                f.endsWith(".webp"))
          );

          const thumbnail = imgFile
            ? `/downloads/${encodeURIComponent(entryName)}/${encodeURIComponent(imgFile)}`
            : "";

          tracks.push({
            id: `lib-folder-${idx}-${audioStat.mtimeMs}`,
            fileName: entryName, // Directory name for deletion
            title: entryName,
            thumbnail,
            url: `/downloads/${encodeURIComponent(entryName)}/${encodeURIComponent(audioFile)}`,
            sizeMB,
            updatedAt: audioStat.mtime.toLocaleDateString("vi-VN"),
            format: ext.toUpperCase(),
          });
        }
      } else if (
        entryName.endsWith(".mp3") ||
        entryName.endsWith(".m4a") ||
        entryName.endsWith(".flac") ||
        entryName.endsWith(".wav") ||
        entryName.endsWith(".webm")
      ) {
        // Backwards compatibility for standalone flat files
        const sizeMB = (stat.size / (1024 * 1024)).toFixed(1) + " MB";
        const ext = path.extname(entryName).slice(1);
        const title = entryName.replace(/_\d+kbps\.[a-z0-9]+$/i, "").replace(/\.[a-z0-9]+$/i, "");
        const baseName = entryName.replace(/\.[a-z0-9]+$/i, "");

        let thumbnail = "";
        const potentialThumbs = [`${baseName}.jpg`, `${baseName}.png`, `${baseName}.webp`, `${baseName}.jpeg`];
        for (const imgName of potentialThumbs) {
          if (fs.existsSync(path.join(downloadsDir, imgName))) {
            thumbnail = `/downloads/${encodeURIComponent(imgName)}`;
            break;
          }
        }

        tracks.push({
          id: `lib-file-${idx}-${stat.mtimeMs}`,
          fileName: entryName,
          title,
          thumbnail,
          url: `/downloads/${encodeURIComponent(entryName)}`,
          sizeMB,
          updatedAt: stat.mtime.toLocaleDateString("vi-VN"),
          format: ext.toUpperCase(),
        });
      }
    }

    // Sort newest first
    tracks.sort((a, b) => b.id.localeCompare(a.id));

    return NextResponse.json({ success: true, tracks });
  } catch (err) {
    console.error("Library API error:", err);
    return NextResponse.json({ success: false, error: "Không thể đọc danh sách nhạc." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { fileName } = body;

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ success: false, error: "Thiếu tên file hoặc thư mục." }, { status: 400 });
    }

    const downloadsDir = path.join(process.cwd(), "public", "downloads");
    const targetPath = path.join(downloadsDir, fileName);

    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        // Delete entire track directory recursively
        fs.rmSync(targetPath, { recursive: true, force: true });
        return NextResponse.json({ success: true, message: "Đã xóa thư mục bài hát." });
      } else {
        // Delete flat standalone file
        fs.unlinkSync(targetPath);
        const baseName = fileName.replace(/\.[a-z0-9]+$/i, "");
        const potentialThumbs = [`${baseName}.jpg`, `${baseName}.png`, `${baseName}.webp`, `${baseName}.jpeg`];
        for (const imgName of potentialThumbs) {
          const imgPath = path.join(downloadsDir, imgName);
          if (fs.existsSync(imgPath)) {
            try {
              fs.unlinkSync(imgPath);
            } catch {
              // ignore
            }
          }
        }
        return NextResponse.json({ success: true, message: "Đã xóa file bài hát." });
      }
    }

    return NextResponse.json({ success: false, error: "File hoặc thư mục không tồn tại." }, { status: 404 });
  } catch (err) {
    console.error("Delete track error:", err);
    return NextResponse.json({ success: false, error: "Không thể xóa bài hát." }, { status: 500 });
  }
}
