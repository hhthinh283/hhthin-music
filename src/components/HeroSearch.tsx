"use client";

import React, { useState, useEffect } from "react";
import { Search, Clipboard, ArrowRight, Sparkles, Layers, Link as LinkIcon, AlertCircle, X, Disc } from "lucide-react";
import { ExtractResponse } from "@/app/api/extract/route";

interface HeroSearchProps {
  onSearchResult: (data: NonNullable<ExtractResponse["data"]>) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  mode: "single" | "batch";
  setMode: (mode: "single" | "batch") => void;
}

export default function HeroSearch({
  onSearchResult,
  isLoading,
  setIsLoading,
  mode,
  setMode,
}: HeroSearchProps) {
  const [urlInput, setUrlInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);

  // Dynamic platform detection while typing
  useEffect(() => {
    const clean = urlInput.trim().toLowerCase();
    if (clean.includes("youtube.com") || clean.includes("youtu.be")) {
      setDetectedPlatform("YouTube");
    } else if (clean.includes("soundcloud.com")) {
      setDetectedPlatform("SoundCloud");
    } else if (clean.includes("spotify.com")) {
      setDetectedPlatform("Spotify");
    } else if (clean.includes("zingmp3.vn") || clean.includes("mp3.zing.vn")) {
      setDetectedPlatform("Zing MP3");
    } else if (clean.includes("tiktok.com")) {
      setDetectedPlatform("TikTok");
    } else {
      setDetectedPlatform(null);
    }
  }, [urlInput]);

  const executeExtract = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setErrorMessage("Vui lòng dán hoặc nhập đường dẫn nhạc cần tải.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data: ExtractResponse = await res.json();

      if (data.success && data.data) {
        onSearchResult(data.data);
      } else {
        setErrorMessage(data.error || "Không thể lấy thông tin bài hát từ link này.");
      }
    } catch {
      setErrorMessage("Lỗi kết nối máy chủ, vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text);
          setErrorMessage("");
          executeExtract(text);
        }
      }
    } catch {
      alert("Hãy bấm Ctrl+V (hoặc dán) để điền đường dẫn nhé.");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeExtract(urlInput);
  };

  return (
    <section className="hero-section" style={{ paddingTop: "1.5rem" }}>
      <div className="container">
        {/* Single / Batch Mode Selector */}
        <div className="mode-toggle-bar">
          <div className="mode-toggle-group">
            <button
              className={`mode-btn ${mode === "single" ? "active" : ""}`}
              onClick={() => setMode("single")}
            >
              <LinkIcon size={16} />
              <span>Tải 1 Link Trực Tiếp</span>
            </button>
            <button
              className={`mode-btn ${mode === "batch" ? "active" : ""}`}
              onClick={() => setMode("batch")}
            >
              <Layers size={16} />
              <span>Tải Hàng Loạt (Multi-Link)</span>
            </button>
          </div>
        </div>

        {/* Input Box Card */}
        {mode === "single" && (
          <div className="search-container">
            <form onSubmit={handleSearchSubmit} className="search-box-card">
              <div className="search-input-group">
                <div className="input-icon-wrapper">
                  <Search size={22} />
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Dán URL bài hát (Ví dụ: https://www.youtube.com/watch?v=...)"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                />

                {/* Detected Platform Tag */}
                {detectedPlatform && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      background: "rgba(99, 102, 241, 0.2)",
                      border: "1px solid rgba(99, 102, 241, 0.4)",
                      color: "#a5b4fc",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Disc size={12} />
                    {detectedPlatform}
                  </span>
                )}

                {urlInput && (
                  <button
                    type="button"
                    onClick={() => setUrlInput("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <X size={18} />
                  </button>
                )}

                <div className="input-actions">
                  <button
                    type="button"
                    className="btn-paste"
                    onClick={handlePaste}
                    title="Dán từ Clipboard"
                  >
                    <Clipboard size={16} />
                    <span>Dán Link</span>
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="animate-spin" size={18} />
                        <span>Phân Tích...</span>
                      </>
                    ) : (
                      <>
                        <span>Tải Về</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Error Feedback */}
            {errorMessage && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "#f87171",
                  marginTop: "1rem",
                  fontSize: "0.9rem",
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
