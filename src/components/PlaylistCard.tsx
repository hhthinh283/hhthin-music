"use client";

import React, { useState } from "react";
import { ListMusic, Play, Pause, Download, Search, Clock, CheckSquare, Square, Sparkles } from "lucide-react";
import { PlaylistInfo, PlaylistItem } from "@/app/api/extract/route";
import { useAudio } from "@/context/AudioContext";

interface PlaylistCardProps {
  playlist: PlaylistInfo;
  onSelectTrack?: (item: PlaylistItem) => void;
}

export default function PlaylistCard({ playlist, onSelectTrack }: PlaylistCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    () => new Set(playlist.items.map((i) => i.id))
  );
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();

  const filteredItems = playlist.items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAllSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedTrackIds.has(i.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedTrackIds);
      filteredItems.forEach((i) => next.delete(i.id));
      setSelectedTrackIds(next);
    } else {
      const next = new Set(selectedTrackIds);
      filteredItems.forEach((i) => next.add(i.id));
      setSelectedTrackIds(next);
    }
  };

  const toggleSelectTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedTrackIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTrackIds(next);
  };

  const handleTrackClick = (item: PlaylistItem) => {
    if (currentTrack?.url === item.audioPreviewUrl) {
      togglePlay();
    } else {
      const globalTracks = playlist.items.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        url: t.audioPreviewUrl,
        duration: t.duration,
        durationSeconds: t.durationSeconds,
      }));

      const targetGlobalTrack = {
        id: item.id,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        url: item.audioPreviewUrl,
        duration: item.duration,
        durationSeconds: item.durationSeconds,
      };

      playTrack(targetGlobalTrack, globalTracks);
      if (onSelectTrack) onSelectTrack(item);
    }
  };

  const handleDownloadTrack = async (item: PlaylistItem) => {
    setDownloadingId(item.id);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: item.url,
          title: item.title,
          thumbnail: item.thumbnail,
          format: "mp3",
          quality: "320kbps",
        }),
      });

      const res = await response.json();
      if (!res.success) {
        alert(res.error || "Không thể lưu bài hát này.");
      }
    } catch {
      alert("Không thể tải bài hát này. Vui lòng thử lại!");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadSelected = async () => {
    const selectedItems = playlist.items.filter((i) => selectedTrackIds.has(i.id));
    if (selectedItems.length === 0) return;

    setIsBatchDownloading(true);

    for (let i = 0; i < selectedItems.length; i++) {
      await handleDownloadTrack(selectedItems[i]);
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsBatchDownloading(false);
  };

  return (
    <div
      style={{
        maxWidth: "860px",
        margin: "2rem auto 0",
        padding: "20px"
      }}
    >
      {/* Playlist Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
            }}
          >
            <ListMusic size={24} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-main)" }}>
              {playlist.title}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Phát hiện {playlist.count} bài hát • Đã chọn {selectedTrackIds.size}/{playlist.count} bài
            </p>
          </div>
        </div>

        {/* Filter Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(10, 12, 20, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "6px 14px",
              maxWidth: "220px",
            }}
          >
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Lọc bài hát..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-main)",
                fontSize: "0.85rem",
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Checkbox Selection Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          marginBottom: "10px",
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <button
          onClick={toggleSelectAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "var(--text-main)",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
        >
          {isAllSelected ? (
            <CheckSquare size={18} color="#818cf8" />
          ) : (
            <Square size={18} color="var(--text-dim)" />
          )}
          <span>{isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</span>
        </button>

        <button
          onClick={handleDownloadSelected}
          disabled={selectedTrackIds.size === 0 || isBatchDownloading}
          className="btn-primary"
          style={{
            padding: "8px 16px",
            fontSize: "0.85rem",
            borderRadius: "12px",
            opacity: selectedTrackIds.size === 0 ? 0.5 : 1,
          }}
        >
          {isBatchDownloading ? (
            <>
              <Sparkles className="animate-spin" size={16} />
              <span>Đang Lưu Danh Sách...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Lưu {selectedTrackIds.size} Bài Đã Chọn</span>
            </>
          )}
        </button>
      </div>

      {/* Playlist Track Items Table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "480px", overflowY: "auto", paddingRight: "4px" }}>
        {filteredItems.map((item, idx) => {
          const isActive = currentTrack?.url === item.audioPreviewUrl;
          const isItemPlaying = isActive && isPlaying;
          const isChecked = selectedTrackIds.has(item.id);

          return (
            <div
              key={item.id}
              onClick={() => handleTrackClick(item)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "16px",
                background: isActive
                  ? "rgba(99, 102, 241, 0.18)"
                  : isChecked
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(255, 255, 255, 0.015)",
                border: isActive
                  ? "1px solid rgba(99, 102, 241, 0.5)"
                  : isChecked
                  ? "1px solid rgba(255, 255, 255, 0.1)"
                  : "1px solid rgba(255, 255, 255, 0.04)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
                {/* Track Checkbox */}
                <button
                  onClick={(e) => toggleSelectTrack(item.id, e)}
                  style={{
                    background: "none",
                    border: "none",
                    color: isChecked ? "#818cf8" : "var(--text-dim)",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title={isChecked ? "Bỏ chọn" : "Chọn bài này"}
                >
                  {isChecked ? <CheckSquare size={18} color="#818cf8" /> : <Square size={18} />}
                </button>

                {/* Index / Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrackClick(item);
                  }}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: "none",
                    background: isActive ? "var(--gradient-primary)" : "rgba(255, 255, 255, 0.08)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  title={isItemPlaying ? "Tạm dừng" : "Nghe thử"}
                >
                  {isItemPlaying ? (
                    <Pause size={15} />
                  ) : (
                    <Play size={15} style={{ marginLeft: isActive ? "2px" : "0" }} />
                  )}
                </button>

                {/* Track Thumbnail */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                    flexShrink: 0,
                  }}
                />

                {/* Track Info */}
                <div style={{ overflow: "hidden", flex: 1, paddingRight: "10px" }}>
                  <p
                    style={{
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      color: isActive ? "#ffffff" : "var(--text-main)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {idx + 1}. {item.title}
                  </p>
                  <p style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                    {item.artist}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={12} /> {item.duration}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadTrack(item);
                  }}
                  disabled={downloadingId === item.id}
                  className="btn-paste"
                  style={{
                    padding: "7px 13px",
                    borderRadius: "12px",
                    background: "rgba(16, 185, 129, 0.15)",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                    color: "#34d399",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                  }}
                >
                  <Download size={14} />
                  <span>{downloadingId === item.id ? "Đang Lưu..." : "Lưu MP3"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
