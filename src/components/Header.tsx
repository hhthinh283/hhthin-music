"use client";

import React from "react";
import { Music, DownloadCloud, Disc } from "lucide-react";

interface HeaderProps {
  activeTab?: "downloader" | "library";
  setActiveTab?: (tab: "downloader" | "library") => void;
}

export default function Header({ activeTab = "downloader", setActiveTab }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          <a href="#" className="logo-link" onClick={() => setActiveTab?.("downloader")}>
            <div className="logo-icon-box">
              <Music size={24} className="text-white" />
            </div>
          </a>

          {setActiveTab && (
            <div className="mode-toggle-group">
              <button
                className={`mode-btn ${activeTab === "downloader" ? "active" : ""}`}
                onClick={() => setActiveTab("downloader")}
              >
                <DownloadCloud size={16} />
                <span>Tải Nhạc</span>
              </button>
              <button
                className={`mode-btn ${activeTab === "library" ? "active" : ""}`}
                onClick={() => setActiveTab("library")}
              >
                <Disc size={16} />
                <span>Thư Viện</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
