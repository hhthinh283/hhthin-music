import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { getYtDlpPath } from "@/lib/ytDlp";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing URL parameter", { status: 400 });
  }

  try {
    const ytDlpPath = await getYtDlpPath();
    const child = spawn(ytDlpPath, [
      "-o",
      "-",
      "-f",
      "bestaudio[vcodec=none]/ba[vcodec=none]/bestaudio/ba",
      "--no-playlist",
      targetUrl,
    ]);

    const readable = new ReadableStream({
      start(controller) {
        child.stdout.on("data", (chunk) => {
          controller.enqueue(chunk);
        });

        child.stdout.on("end", () => {
          controller.close();
        });

        child.on("error", (err) => {
          controller.error(err);
        });

        child.stderr.on("data", (data) => {
          // Log stderr for debugging if needed
          console.error("yt-dlp stream stderr:", data.toString());
        });
      },
      cancel() {
        child.kill();
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Type": "audio/webm",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Stream route error:", err);
    return new NextResponse("Stream extraction failed", { status: 500 });
  }
}
