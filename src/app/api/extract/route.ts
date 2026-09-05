import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface DownloadOption {
  id: string;
  format: "mp3" | "m4a" | "flac" | "wav";
  quality: string;
  size: string;
  bitrate: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  url: string;
  audioPreviewUrl: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  count: number;
  items: PlaylistItem[];
}

export interface ExtractResponse {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    url: string;
    platform: "youtube" | "soundcloud" | "spotify" | "zingmp3" | "tiktok" | "facebook" | "apple" | "generic";
    platformName: string;
    title: string;
    artist: string;
    duration: string;
    durationSeconds: number;
    thumbnail: string;
    audioPreviewUrl: string;
    views: string;
    releaseDate: string;
    downloadOptions: DownloadOption[];
    playlist?: PlaylistInfo;
  };
}

function calculateSize(bitrateKbps: number, durationSec: number): string {
  const bytes = (bitrateKbps * 1000 * durationSec) / 8;
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(mb * 10) / 10} MB` : `${mb.toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "03:20";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { success: false, error: "Vui lòng dán liên kết bài hát hoặc danh sách phát cần phân tích." },
        { status: 400 }
      );
    }

    const targetUrl = url.trim();

    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "Đường dẫn không hợp lệ. Vui lòng nhập link bắt đầu bằng http:// hoặc https://" },
        { status: 400 }
      );
    }

    const cleanUrl = targetUrl.toLowerCase();
    let platform: "youtube" | "soundcloud" | "spotify" | "zingmp3" | "tiktok" | "facebook" | "apple" | "generic" = "generic";
    let platformName = "Âm Nhạc Đa Nguồn";

    if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
      platform = "youtube";
      platformName = "YouTube Music";
    } else if (cleanUrl.includes("soundcloud.com")) {
      platform = "soundcloud";
      platformName = "SoundCloud";
    } else if (cleanUrl.includes("spotify.com")) {
      platform = "spotify";
      platformName = "Spotify";
    } else if (cleanUrl.includes("zingmp3.vn") || cleanUrl.includes("mp3.zing.vn")) {
      platform = "zingmp3";
      platformName = "Zing MP3";
    } else if (cleanUrl.includes("tiktok.com")) {
      platform = "tiktok";
      platformName = "TikTok Sound";
    }

    const ytDlpPath = path.join(process.cwd(), "bin", "yt-dlp.exe");

    let title = "";
    let artist = "";
    let durationSeconds = 205;
    let thumbnail = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80";
    let views = "1.2M";
    let playlistInfo: PlaylistInfo | undefined = undefined;

    const isPlaylistUrl = cleanUrl.includes("list=") || cleanUrl.includes("playlist") || cleanUrl.includes("/album/");

    // Check & extract Playlist items if present
    if (isPlaylistUrl) {
      try {
        const { stdout: playlistStdout } = await execFileAsync(
          ytDlpPath,
          ["--flat-playlist", "-j", targetUrl],
          { encoding: "utf-8" }
        );

        if (playlistStdout) {
          const lines = playlistStdout.trim().split("\n").filter(Boolean);
          const parsedItems: PlaylistItem[] = [];

          for (let i = 0; i < lines.length; i++) {
            try {
              const itemJson = JSON.parse(lines[i]);
              const trackId = itemJson.id || `track-${i}`;
              const trackTitle = itemJson.title || `Bài Hát ${i + 1}`;
              const trackArtist = itemJson.uploader || itemJson.channel || itemJson.artist || "Nghệ sĩ";
              const trackDurationSec = Math.round(itemJson.duration || 210);
              const trackUrl = itemJson.url || (itemJson.id ? `https://www.youtube.com/watch?v=${itemJson.id}` : targetUrl);
              const trackThumb = itemJson.thumbnails?.[0]?.url || (itemJson.id ? `https://img.youtube.com/vi/${itemJson.id}/hqdefault.jpg` : thumbnail);

              parsedItems.push({
                id: trackId,
                title: trackTitle,
                artist: trackArtist,
                duration: formatDuration(trackDurationSec),
                durationSeconds: trackDurationSec,
                thumbnail: trackThumb,
                url: trackUrl,
                audioPreviewUrl: `/api/stream?url=${encodeURIComponent(trackUrl)}`,
              });
            } catch {
              // skip invalid line
            }
          }

          if (parsedItems.length > 0) {
            playlistInfo = {
              id: "pl-" + Date.now().toString(36),
              title: `Danh Sách Phát (${parsedItems.length} bài)`,
              count: parsedItems.length,
              items: parsedItems,
            };

            // Set primary track from 1st playlist item
            title = parsedItems[0].title;
            artist = parsedItems[0].artist;
            durationSeconds = parsedItems[0].durationSeconds;
            thumbnail = parsedItems[0].thumbnail;
          }
        }
      } catch {
        // Fallback single item metadata below
      }
    }

    // Single track metadata extraction
    if (!title) {
      try {
        const { stdout } = await execFileAsync(
          ytDlpPath,
          ["-j", "--no-playlist", targetUrl],
          { encoding: "utf-8" }
        );

        if (stdout) {
          const metadata = JSON.parse(stdout);
          title = metadata.title || metadata.fulltitle || title;
          artist = metadata.uploader || metadata.channel || metadata.artist || artist;
          durationSeconds = Math.round(metadata.duration || durationSeconds);
          thumbnail = metadata.thumbnail || thumbnail;
          if (metadata.view_count) {
            const v = metadata.view_count;
            views = v > 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${Math.round(v / 1000)}K`;
          }
        }
      } catch {
        if (platform === "youtube") {
          try {
            const oembedRes = await fetch(
              `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`
            );
            if (oembedRes.ok) {
              const data = await oembedRes.json();
              title = data.title;
              artist = data.author_name;
              thumbnail = data.thumbnail_url;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (!title) title = "Audio Track - High Quality";
    if (!artist) artist = "Nghệ sĩ Đề xuất";

    const audioPreviewUrl = `/api/stream?url=${encodeURIComponent(targetUrl)}`;

    return NextResponse.json({
      success: true,
      data: {
        id: "track-" + Date.now().toString(36),
        url: targetUrl,
        platform,
        platformName,
        title,
        artist,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        thumbnail,
        audioPreviewUrl,
        views,
        releaseDate: new Date().getFullYear().toString(),
        downloadOptions: [
          {
            id: "opt-320",
            format: "mp3",
            quality: "320 kbps (Chất lượng gốc)",
            size: calculateSize(320, durationSeconds),
            bitrate: 320,
          },
          {
            id: "opt-128",
            format: "mp3",
            quality: "128 kbps (Tiêu chuẩn)",
            size: calculateSize(128, durationSeconds),
            bitrate: 128,
          },
          {
            id: "opt-flac",
            format: "flac",
            quality: "FLAC (Lossless)",
            size: calculateSize(1411, durationSeconds),
            bitrate: 1411,
          },
          {
            id: "opt-m4a",
            format: "m4a",
            quality: "M4A (Apple AAC)",
            size: calculateSize(256, durationSeconds),
            bitrate: 256,
          },
        ],
        playlist: playlistInfo,
      },
    } as ExtractResponse);
  } catch {
    return NextResponse.json(
      { success: false, error: "Đã xảy ra lỗi hệ thống khi phân tích bài hát." },
      { status: 500 }
    );
  }
}
