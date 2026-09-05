import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

export const execFileAsync = promisify(execFile);

export function getDownloadsDir(): string {
  // On Vercel serverless or production read-only filesystem, use /tmp/downloads
  const isVercel = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  
  if (isVercel) {
    const tmpDir = path.join("/tmp", "downloads");
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    return tmpDir;
  }

  const downloadsDir = path.join(process.cwd(), "public", "downloads");
  if (!fs.existsSync(downloadsDir)) {
    try {
      fs.mkdirSync(downloadsDir, { recursive: true });
    } catch {
      const tmpDir = path.join("/tmp", "downloads");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    }
  }

  return downloadsDir;
}

export async function getYtDlpPath(): Promise<string> {
  if (process.platform === "win32") {
    const winBin = path.join(process.cwd(), "bin", "yt-dlp.exe");
    if (fs.existsSync(winBin)) return winBin;
    return "yt-dlp";
  }

  // Linux / Vercel Serverless environment
  const tmpBin = path.join("/tmp", "yt-dlp");

  if (fs.existsSync(tmpBin)) {
    return tmpBin;
  }

  try {
    console.log("Downloading yt-dlp Linux binary for Vercel Serverless...");
    const res = await fetch("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp");
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      fs.writeFileSync(tmpBin, Buffer.from(arrayBuf));
      fs.chmodSync(tmpBin, 0o755);
      console.log("yt-dlp Linux binary ready at /tmp/yt-dlp");
      return tmpBin;
    }
  } catch (err) {
    console.error("Failed to download yt-dlp Linux binary:", err);
  }

  return "yt-dlp";
}
