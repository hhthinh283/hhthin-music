"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import HeroSearch from "@/components/HeroSearch";
import MediaResultCard from "@/components/MediaResultCard";
import PlaylistCard from "@/components/PlaylistCard";
import BatchDownloader from "@/components/BatchDownloader";
import LibraryPlayer from "@/components/LibraryPlayer";
import GlobalBottomBar from "@/components/GlobalBottomBar";
import { ExtractResponse } from "@/app/api/extract/route";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"downloader" | "library">("downloader");
  const [resultData, setResultData] = useState<ExtractResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");

  const handleSearchResult = (data: NonNullable<ExtractResponse["data"]>) => {
    setResultData(data);
    setTimeout(() => {
      window.scrollTo({
        top: 380,
        behavior: "smooth",
      });
    }, 100);
  };

  return (
    <>
      {/* Navigation Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main style={{ paddingBottom: "10rem" }}>
        {activeTab === "downloader" ? (
          <>
            {/* Hero Section with Search Bar */}
            <HeroSearch
              onSearchResult={handleSearchResult}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              mode={mode}
              setMode={setMode}
            />

            {/* Single Link Track Result Card */}
            {mode === "single" && resultData && (
              <>
                <MediaResultCard data={resultData} />
                {resultData.playlist && (
                  <PlaylistCard playlist={resultData.playlist} />
                )}
              </>
            )}

            {/* Batch Multi-link Downloader */}
            {mode === "batch" && <BatchDownloader />}
          </>
        ) : (
          /* Music Library Player Page */
          <LibraryPlayer onSwitchToDownloadTab={() => setActiveTab("downloader")} />
        )}
      </main>

      {/* Persistent Audio Player Bar across tab switching */}
      <GlobalBottomBar onOpenLibrary={() => setActiveTab("library")} />
    </>
  );
}
