import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

export const execFileAsync = promisify(execFile);

export function getDownloadsDir(): string {
  const downloadsDir = path.join(process.cwd(), "public", "downloads");
  if (!fs.existsSync(downloadsDir)) {
    try {
      fs.mkdirSync(downloadsDir, { recursive: true });
    } catch (err) {
      console.error("Error creating public/downloads directory:", err);
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
    try {
      const stat = fs.statSync(tmpBin);
      // yt-dlp_linux standalone binary is > 10MB. If < 10MB, it is the old python zipapp script
      if (stat.size > 10 * 1024 * 1024) {
        return tmpBin;
      }
      fs.unlinkSync(tmpBin);
    } catch {
      // ignore
    }
  }

  try {
    console.log("Downloading yt-dlp_linux standalone binary for Vercel Serverless...");
    const res = await fetch("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux");
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      fs.writeFileSync(tmpBin, Buffer.from(arrayBuf));
      fs.chmodSync(tmpBin, 0o755);
      console.log("yt-dlp_linux standalone binary ready at /tmp/yt-dlp");
      return tmpBin;
    }
  } catch (err) {
    console.error("Failed to download yt-dlp Linux binary:", err);
  }

  return "yt-dlp";
}
