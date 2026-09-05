import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDownloadsDir } from "@/lib/ytDlp";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    if (pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const downloadsDir = getDownloadsDir();
    const targetFilePath = path.join(downloadsDir, ...pathSegments);

    // Check primary downloads dir
    let fileExists = fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile();
    let finalPath = targetFilePath;

    // Fallback checks
    if (!fileExists) {
      const publicPath = path.join(process.cwd(), "public", "downloads", ...pathSegments);
      const tmpPath = path.join("/tmp", "downloads", ...pathSegments);
      if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        finalPath = publicPath;
        fileExists = true;
      } else if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).isFile()) {
        finalPath = tmpPath;
        fileExists = true;
      }
    }

    if (!fileExists) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const stat = fs.statSync(finalPath);
    const fileBuffer = fs.readFileSync(finalPath);
    const ext = path.extname(finalPath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".m4a") contentType = "audio/mp4";
    else if (ext === ".webm") contentType = "audio/webm";
    else if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".flac") contentType = "audio/flac";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Downloads route serve error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
