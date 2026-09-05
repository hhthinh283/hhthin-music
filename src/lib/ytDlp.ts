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

export function getFfmpegLocation(): string | null {
  if (process.platform === "win32") {
    // 1. Check project local bin/
    const binDir = path.join(process.cwd(), "bin");
    if (fs.existsSync(path.join(binDir, "ffmpeg.exe"))) {
      return binDir;
    }

    // 2. Check static_ffmpeg from Python packages if installed
    const appData =
      process.env.LOCALAPPDATA ||
      (process.env.USERPROFILE
        ? path.join(process.env.USERPROFILE, "AppData", "Local")
        : "");

    if (appData) {
      const pythonStaticFfmpeg = path.join(
        appData,
        "Packages",
        "PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0",
        "LocalCache",
        "local-packages",
        "Python313",
        "site-packages",
        "static_ffmpeg",
        "bin",
        "win32"
      );
      if (fs.existsSync(path.join(pythonStaticFfmpeg, "ffmpeg.exe"))) {
        return pythonStaticFfmpeg;
      }

      // Check CapCut ffmpeg
      const capcutDir = path.join(appData, "CapCut", "Apps", "9.3.0.3970");
      if (fs.existsSync(path.join(capcutDir, "ffmpeg.exe"))) {
        return capcutDir;
      }
    }
  }

  return null;
}
