"use client";

import React, { useState } from "react";
import { Layers, Download, CheckCircle, Sparkles, RefreshCw, Trash2, CheckSquare, Square } from "lucide-react";
import { ExtractResponse } from "@/app/api/extract/route";

interface BatchItem {
  id: string;
  url: string;
  status: "pending" | "processing" | "ready" | "error";
  data?: NonNullable<ExtractResponse["data"]>;
}

export default function BatchDownloader() {
  const [textInput, setTextInput] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const readyItems = items.filter((i) => i.status === "ready" && i.data);
  const isAllSelected = readyItems.length > 0 && readyItems.every((i) => selectedItemIds.has(i.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(readyItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItemIds(next);
  };

  const handleProcessBatch = async () => {
    const urls = textInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;

    setIsProcessing(true);
    const newItems: BatchItem[] = urls.map((url, index) => ({
      id: `batch-${index}-${Date.now()}`,
      url,
      status: "pending",
    }));

    setItems(newItems);
    setSelectedItemIds(new Set());

    for (let i = 0; i < newItems.length; i++) {
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item))
      );

      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: newItems[i].url }),
        });

        const data: ExtractResponse = await res.json();

        if (data.success && data.data) {
          const readyId = newItems[i].id;
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "ready", data: data.data } : item
            )
          );
          setSelectedItemIds((prev) => new Set([...prev, readyId]));
        } else {
          setItems((prev) =>
            prev.map((item, idx) => (idx === i ? { ...item, status: "error" } : item))
          );
        }
      } catch {
        setItems((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "error" } : item))
        );
      }

      await new Promise((r) => setTimeout(r, 400));
    }

    setIsProcessing(false);
  };

  const handleDownloadTrack = async (trackUrl: string, title: string, thumbnail: string, format: string) => {
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trackUrl,
          title,
          thumbnail,
          format,
          quality: "320kbps",
        }),
      });

      const res = await response.json();
      if (!res.success) {
        alert(res.error || "Không thể lưu bài hát này.");
      }
    } catch {
      alert("Không thể tải bài hát này.");
    }
  };

  const handleDownloadSelected = async () => {
    const selectedItems = items.filter((i) => selectedItemIds.has(i.id) && i.data);
    if (selectedItems.length === 0) return;

    setIsBatchDownloading(true);

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      await handleDownloadTrack(item.data!.url, item.data!.title, item.data!.thumbnail || "", "mp3");
      await new Promise((r) => setTimeout(r, 400));
    }

    setIsBatchDownloading(false);
  };

  const clearBatch = () => {
    setItems([]);
    setSelectedItemIds(new Set());
  };

  return (
    <div className="container" style={{ maxWidth: "860px", marginTop: "1rem" }}>
      <div
        className="glass-card"
        style={{
          background: "rgba(15, 18, 29, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
          <div
            style={{
              padding: "10px",
              borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Tải Nhạc Hàng Loạt (Multi-Link)</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Dán nhiều đường dẫn (mỗi dòng 1 link) để phân tích và chọn tải về bài hát.
            </p>
          </div>
        </div>

        <textarea
          rows={4}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Dán các URL bài hát tại đây, mỗi link 1 dòng..."
          style={{
            width: "100%",
            background: "rgba(10, 12, 20, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "14px",
            color: "var(--text-main)",
            fontFamily: "var(--font-main)",
            fontSize: "0.95rem",
            outline: "none",
            resize: "vertical",
            marginBottom: "1rem",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={clearBatch}
            className="btn-paste"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Trash2 size={16} />
            <span>Xóa Tất Cả</span>
          </button>

          <button
            onClick={handleProcessBatch}
            disabled={isProcessing}
            className="btn-primary"
            style={{ padding: "12px 24px" }}
          >
            {isProcessing ? (
              <>
                <Sparkles className="animate-spin" size={18} />
                <span>Đang Phân Tích Danh Sách...</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Bắt Đầu Xử Lý Hàng Loạt</span>
              </>
            )}
          </button>
        </div>

        {/* Results Queue Table */}
        {items.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-muted)" }}>
                Danh Sách Bài Hát Kết Quả ({readyItems.length}/{items.length}):
              </h4>

              {readyItems.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "none",
                      border: "none",
                      color: "var(--text-main)",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {isAllSelected ? <CheckSquare size={16} color="#818cf8" /> : <Square size={16} />}
                    <span>{isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</span>
                  </button>

                  <button
                    onClick={handleDownloadSelected}
                    disabled={selectedItemIds.size === 0 || isBatchDownloading}
                    className="btn-primary"
                    style={{ padding: "6px 14px", fontSize: "0.8rem", borderRadius: "10px" }}
                  >
                    {isBatchDownloading ? (
                      <>
                        <Sparkles className="animate-spin" size={14} />
                        <span>Đang Tải...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Tải {selectedItemIds.size} Bài Đã Chọn</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {items.map((item, idx) => {
                const isReady = item.status === "ready" && item.data;
                const isChecked = selectedItemIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "14px",
                      background: isChecked ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: isChecked ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                      {/* Checkbox for ready items */}
                      {isReady ? (
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: isChecked ? "#818cf8" : "var(--text-dim)",
                            cursor: "pointer",
                            padding: "2px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {isChecked ? <CheckSquare size={18} color="#818cf8" /> : <Square size={18} />}
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-dim)", width: "20px" }}>
                          {idx + 1}.
                        </span>
                      )}

                      {isReady && (
                        <img
                          src={item.data!.thumbnail}
                          alt=""
                          style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }}
                        />
                      )}

                      <div style={{ overflow: "hidden" }}>
                        <p
                          style={{
                            fontWeight: "700",
                            fontSize: "0.95rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "350px",
                          }}
                        >
                          {item.data ? item.data.title : item.url}
                        </p>
                        <p style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                          {item.data ? `${item.data.artist} • ${item.data.platformName}` : "Đang chờ..."}
                        </p>
                      </div>
                    </div>

                    <div>
                      {item.status === "pending" && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Chờ xử lý</span>
                      )}
                      {item.status === "processing" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#818cf8", fontSize: "0.85rem" }}>
                          <Sparkles size={14} className="animate-spin" />
                          <span>Phân tích...</span>
                        </div>
                      )}
                      {isReady && (
                        <button
                          onClick={() => handleDownloadTrack(item.data!.url, item.data!.title, item.data!.thumbnail || "", "mp3")}
                          className="btn-paste"
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            borderColor: "rgba(16, 185, 129, 0.3)",
                            color: "#34d399",
                          }}
                        >
                          <Download size={14} />
                          <span>Tải MP3 (320k)</span>
                        </button>
                      )}
                      {item.status === "error" && (
                        <span style={{ fontSize: "0.8rem", color: "#f87171" }}>Lỗi đường dẫn</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
