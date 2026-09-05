"use client";

import React from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat } from "lucide-react";
import { useAudio } from "@/context/AudioContext";

interface GlobalBottomBarProps {
  onOpenLibrary?: () => void;
}

export default function GlobalBottomBar({ onOpenLibrary }: GlobalBottomBarProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * (duration || 1);
    seek(newTime);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        background: "#18181b",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "12px 2rem 14px",
        boxShadow: "0 -10px 30px rgba(0,0,0,0.7)",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {/* Row 1: Track Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          <h4
            onClick={onOpenLibrary}
            style={{
              fontSize: "1.05rem",
              fontWeight: "700",
              color: "#ffffff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              margin: 0,
              cursor: onOpenLibrary ? "pointer" : "default",
            }}
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h4>
        </div>

        {/* Row 2: Time Scrubber */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%" }}>
          <span
            style={{
              fontSize: "0.825rem",
              color: "#9ca3af",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
              minWidth: "42px",
            }}
          >
            {formatTime(currentTime)}
          </span>

          <div
            onClick={handleSeek}
            style={{
              flex: 1,
              height: "6px",
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                background: "linear-gradient(90deg, #6366f1 0%, #ec4899 100%)",
                borderRadius: "10px",
              }}
            />
          </div>

          <span
            style={{
              fontSize: "0.825rem",
              color: "#9ca3af",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
              minWidth: "42px",
              textAlign: "right",
            }}
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Row 3: Controls (Left) and Volume (Right) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "2px",
          }}
        >
          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              onClick={toggleShuffle}
              style={{
                background: "none",
                border: "none",
                color: isShuffle ? "#a5b4fc" : "#6b7280",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
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
                color: "#e5e7eb",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
              title="Bài trước"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #d946ef 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(168, 85, 247, 0.5)",
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: "2px" }} />}
            </button>

            <button
              onClick={nextTrack}
              style={{
                background: "none",
                border: "none",
                color: "#e5e7eb",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
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
                color: isRepeat ? "#a5b4fc" : "#6b7280",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
              title="Lặp lại bài hát"
            >
              <Repeat size={18} />
            </button>
          </div>

          {/* Volume Control */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={toggleMute}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                width: "90px",
                accentColor: "#6366f1",
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
