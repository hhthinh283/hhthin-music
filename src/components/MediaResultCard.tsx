"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Download,
  CheckCircle2,
  Volume2,
  Clock,
  Sparkles,
  Music,
  Share2,
  Check,
  Disc,
  FolderCheck,
} from "lucide-react";
import { ExtractResponse, DownloadOption } from "@/app/api/extract/route";
import { useAudio } from "@/context/AudioContext";

interface MediaResultCardProps {
  data: NonNullable<ExtractResponse["data"]>;
}

export default function MediaResultCard({ data }: MediaResultCardProps) {
  const [selectedQuality, setSelectedQuality] = useState<DownloadOption>(
    data.downloadOptions[0]
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [savedNotification, setSavedNotification] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    togglePlay,
    seek,
  } = useAudio();

  const isCurrentPlayingTrack = currentTrack?.url === data.audioPreviewUrl;
  const isThisPlaying = isCurrentPlayingTrack && isPlaying;

  const handleTogglePlay = () => {
    if (isCurrentPlayingTrack) {
      togglePlay();
    } else {
      playTrack({
        id: data.id,
        title: data.title,
        artist: data.artist,
        thumbnail: data.thumbnail,
        url: data.audioPreviewUrl,
        duration: data.duration,
        durationSeconds: data.durationSeconds,
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * (duration || 1);
    seek(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Silent download: saves to public/downloads without opening browser download dialog window
  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(20);
    setSavedNotification(null);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 200);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.url,
          title: data.title,
          thumbnail: data.thumbnail,
          format: selectedQuality.format,
          quality: `${selectedQuality.bitrate}kbps`,
        }),
      });

      const result = await response.json();
      setDownloadProgress(100);

      if (result.success) {
        setSavedNotification({
          fileName: result.fileName,
          fileUrl: result.fileUrl,
        });
      } else {
        alert(result.error || "Không thể lưu file nhạc.");
      }
    } catch {
      alert("Không thể lưu file nhạc, vui lòng thử lại sau.");
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 600);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(data.url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="result-section">
      <div className="media-result-card">
        {/* Cover Art */}
        <div className="media-cover-container">
          <img
            src={data.thumbnail}
            alt={data.title}
            className="media-cover-img"
          />
          <button
            className={`play-overlay-btn ${isThisPlaying ? "playing" : ""}`}
            onClick={handleTogglePlay}
            title={isThisPlaying ? "Tạm dừng Nghe Thử" : "Nghe Thử Bài Hát"}
          >
            <div className="play-circle">
              {isThisPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: "3px" }} />}
            </div>
          </button>
        </div>

        {/* Details & Controls */}
        <div className="media-details">
          <div>
            <div className="media-header-info">
              <span className={`source-badge ${data.platform}`}>
                <Disc size={12} /> {data.platformName}
              </span>
              <h2 className="media-title">{data.title}</h2>
              <p className="media-artist">
                <Music size={16} /> {data.artist}
              </p>
            </div>

            <div className="media-meta-bar">
              <span className="meta-item">
                <Clock size={14} /> {data.duration}
              </span>
              <span>•</span>
              <span className="meta-item">
                <Sparkles size={14} /> Lượt xem: {data.views}
              </span>
            </div>

            {/* Audio Preview Scrubber Bar */}
            <div className="audio-player-strip">
              <button
                onClick={handleTogglePlay}
                style={{
                  background: "none",
                  border: "none",
                  color: "#06b6d4",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isThisPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span className="time-display">{formatTime(isCurrentPlayingTrack ? currentTime : 0)}</span>
              <div className="audio-scrubber" onClick={handleSeek}>
                <div
                  className="audio-progress"
                  style={{
                    width: `${isCurrentPlayingTrack && duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="time-display">{data.duration}</span>
              <Volume2 size={16} className="text-muted" style={{ marginLeft: "4px" }} />
            </div>

            {/* Quality Selection Grid */}
            <p className="download-options-title">Chọn Chất Lượng / Định Dạng:</p>
            <div className="quality-grid">
              {data.downloadOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`quality-option-btn ${
                    selectedQuality.id === opt.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedQuality(opt)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span className="quality-label">{opt.format.toUpperCase()}</span>
                    {selectedQuality.id === opt.id && (
                      <CheckCircle2 size={14} color="#6366f1" />
                    )}
                  </div>
                  <span className="quality-subtext">
                    {opt.quality} ({opt.size})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="action-row">
            <button
              className="btn-download-action"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Sparkles className="animate-spin" size={20} />
                  <span>Đang Trích Xuất & Lưu File ({downloadProgress}%)...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>
                    Lưu Về public/downloads ({selectedQuality.format.toUpperCase()} - {selectedQuality.bitrate}kbps)
                  </span>
                </>
              )}
            </button>

            <button
              className="btn-paste"
              onClick={handleShare}
              title="Sao chép link bài hát"
              style={{ padding: "14px 18px", borderRadius: "14px" }}
            >
              {isCopied ? <Check size={18} color="#10b981" /> : <Share2 size={18} />}
            </button>
          </div>

          {/* Notification when file is saved silently into public/downloads */}
          {savedNotification && (
            <div
              style={{
                marginTop: "1rem",
                padding: "12px 16px",
                borderRadius: "14px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FolderCheck size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Đã lưu file thành công về thư mục public/downloads/</strong>
                <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Tên file: <code>{savedNotification.fileName}</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
