"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Trash2,
  Disc,
  RefreshCw,
  Search,
  DownloadCloud,
} from "lucide-react";
import { LibraryTrack } from "@/app/api/library/route";
import { useAudio } from "@/context/AudioContext";

interface LibraryPlayerProps {
  onSwitchToDownloadTab?: () => void;
}

export default function LibraryPlayer({ onSwitchToDownloadTab }: LibraryPlayerProps) {
  const [tracks, setTracks] = useState<LibraryTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      if (data.success && data.tracks) {
        setTracks(data.tracks);
      }
    } catch {
      console.error("Lỗi khi tải danh sách nhạc");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const playLibraryTrack = (track: LibraryTrack) => {
    const globalTracks = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: "public/downloads",
      thumbnail: t.thumbnail || "",
      url: t.url,
      duration: "",
    }));

    const targetGlobal = {
      id: track.id,
      title: track.title,
      artist: "public/downloads",
      thumbnail: track.thumbnail || "",
      url: track.url,
    };

    playTrack(targetGlobal, globalTracks);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * (duration || 1);
    seek(newTime);
  };

  const handleDelete = async (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa bài "${fileName}" khỏi public/downloads?`)) return;

    try {
      const res = await fetch("/api/library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      const data = await res.json();
      if (data.success) {
        setTracks((prev) => prev.filter((t) => t.fileName !== fileName));
      }
    } catch {
      alert("Không thể xóa file.");
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const filteredTracks = tracks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container" style={{ maxWidth: "900px", marginTop: "1rem" }}>
      {/* Main Music Player Card */}
      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800" }}>Trình Phát Thư Viện Nhạc</h2>
          </div>

          <button
            onClick={fetchTracks}
            className="btn-paste"
            title="Tải lại thư viện"
            style={{ padding: "8px 14px", borderRadius: "12px" }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Làm Mới</span>
          </button>
        </div>

        {/* Current Active Track Banner & Controls */}
        {currentTrack ? (
          <div
            style={{
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "20px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Infinite Spinning Vinyl Disc with Cover Image */}
            <div style={{ position: "relative", width: "220px", height: "220px", margin: "0 auto" }}>
              <div
                className={`vinyl-record-container vinyl-disc-infinite ${isPlaying ? "active-playing" : "paused"}`}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                {/* Glossy Metallic Reflection Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.1) 70%, rgba(255,255,255,0) 100%)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />

                {/* Center Thumbnail Album Artwork / Spindle */}
                {currentTrack.thumbnail ? (
                  <div
                    style={{
                      position: "relative",
                      width: "140px",
                      height: "140px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      boxShadow: "0 0 16px rgba(0,0,0,0.8)",
                      border: "4px solid #18181b",
                      zIndex: 1,
                    }}
                  >
                    <img
                      src={currentTrack.thumbnail}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      background: "var(--gradient-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "3px solid #18181b",
                      boxShadow: "0 0 12px rgba(0,0,0,0.6)",
                      zIndex: 1,
                    }}
                  >
                    <Disc size={32} color="#fff" />
                    {/* Center Spindle Hole */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#09090b",
                        border: "2px solid rgba(255,255,255,0.4)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info & Scrubber */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.725rem",
                    fontWeight: "700",
                    padding: "3px 8px",
                    borderRadius: "10px",
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "#a5b4fc",
                  }}
                >
                  ĐANG PHÁT
                </span>
                <h3
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "800",
                    marginTop: "6px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </h3>
              </div>

              {/* Progress Scrubber */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(currentTime)}
                </span>
                <div
                  onClick={handleSeek}
                  style={{
                    flex: 1,
                    height: "6px",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                      background: "var(--gradient-primary)",
                      borderRadius: "4px",
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(duration)}
                </span>
              </div>

              {/* Player Buttons Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={toggleShuffle}
                    style={{
                      background: "none",
                      border: "none",
                      color: isShuffle ? "#6366f1" : "var(--text-dim)",
                      cursor: "pointer",
                    }}
                    title="Phát ngẫu nhiên"
                  >
                    <Shuffle size={18} />
                  </button>

                  <button
                    onClick={prevTrack}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-main)",
                      cursor: "pointer",
                    }}
                    title="Bài trước"
                  >
                    <SkipBack size={20} />
                  </button>

                  <button
                    onClick={togglePlay}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--gradient-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
                    }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: "2px" }} />}
                  </button>

                  <button
                    onClick={nextTrack}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-main)",
                      cursor: "pointer",
                    }}
                    title="Bài kế tiếp"
                  >
                    <SkipForward size={20} />
                  </button>

                  <button
                    onClick={toggleRepeat}
                    style={{
                      background: "none",
                      border: "none",
                      color: isRepeat ? "#6366f1" : "var(--text-dim)",
                      cursor: "pointer",
                    }}
                    title="Lặp lại bài hát"
                  >
                    <Repeat size={18} />
                  </button>
                </div>

                {/* Volume Slider */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={toggleMute}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={{ width: "70px", accentColor: "#6366f1", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--text-muted)",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "20px",
              marginBottom: "1.5rem",
            }}
          >
            <Disc size={40} color="var(--text-dim)" style={{ marginBottom: "10px" }} />
            <p>Chưa có bài hát nào được chọn phát.</p>
            {onSwitchToDownloadTab && (
              <button
                onClick={onSwitchToDownloadTab}
                className="btn-primary"
                style={{ marginTop: "1rem", display: "inline-flex", gap: "8px" }}
              >
                <DownloadCloud size={18} />
                <span>Chuyển Sang Trang Tải Nhạc</span>
              </button>
            )}
          </div>
        )}

        {/* Search Bar for Library Tracks */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-muted)" }}>
            Danh Sách Bài Hát Đã Lưu ({filteredTracks.length}/{tracks.length}):
          </h4>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(10, 12, 20, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "6px 14px",
              width: "220px",
            }}
          >
            <Search size={14} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Tìm nhạc đã tải..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-main)",
                fontSize: "0.825rem",
                width: "100%",
              }}
            />
          </div>
        </div>

        {/* Tracklist Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "380px", overflowY: "auto" }}>
          {filteredTracks.map((track, idx) => {
            const isSelected = currentTrack?.url === track.url;
            const isCurrentPlaying = isSelected && isPlaying;

            return (
              <div
                key={track.id}
                onClick={() => playLibraryTrack(track)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderRadius: "14px",
                  background: isSelected ? "rgba(99, 102, 241, 0.18)" : "rgba(255, 255, 255, 0.025)",
                  border: isSelected ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
                  {/* Play Indicator */}
                  <button
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "none",
                      background: isSelected ? "var(--gradient-primary)" : "rgba(255, 255, 255, 0.08)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {isCurrentPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: "1px" }} />}
                  </button>

                  {/* Track Cover Thumbnail */}
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        objectFit: "cover",
                        boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Disc size={20} color="var(--text-dim)" />
                    </div>
                  )}

                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <p
                      style={{
                        fontWeight: "700",
                        fontSize: "0.925rem",
                        color: isSelected ? "#fff" : "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {idx + 1}. {track.title}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {track.sizeMB} • {track.format} • Ngày lưu: {track.updatedAt}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={(e) => handleDelete(track.fileName, e)}
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#f87171",
                      padding: "8px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    title="Xóa bài hát khỏi public/downloads"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
