"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

export interface GlobalTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
  duration?: string;
  durationSeconds?: number;
}

interface AudioContextType {
  currentTrack: GlobalTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  playlist: GlobalTrack[];
  currentIndex: number;
  playTrack: (track: GlobalTrack, trackList?: GlobalTrack[]) => void;
  updateTrackTitle: (trackId: string, newTitle: string, newUrl?: string) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<GlobalTrack | null>(null);
  const [playlist, setPlaylist] = useState<GlobalTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextTrack();
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentIndex, playlist, isShuffle, isRepeat]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Synchronize OS Media Session controls (Windows/Mac/Android/iOS media notification bar & keyboard keys)
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator && currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || "SoundFetch Player",
          album: "SoundFetch Library",
          artwork: currentTrack.thumbnail
            ? [{ src: currentTrack.thumbnail, sizes: "512x512", type: "image/jpeg" }]
            : [],
        });

        navigator.mediaSession.setActionHandler("play", () => {
          audioRef.current?.play();
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          audioRef.current?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          prevTrack();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          nextTrack();
        });
      } catch (e) {
        console.warn("MediaSession error:", e);
      }
    }
  }, [currentTrack]);

  const playTrack = (track: GlobalTrack, trackList?: GlobalTrack[]) => {
    if (!audioRef.current) return;

    if (trackList && trackList.length > 0) {
      setPlaylist(trackList);
      const foundIdx = trackList.findIndex((t) => t.id === track.id || t.url === track.url);
      setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
    }

    setCurrentTrack(track);
    audioRef.current.src = track.url;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const updateTrackTitle = (trackId: string, newTitle: string, newUrl?: string) => {
    if (currentTrack && (currentTrack.id === trackId || currentTrack.url === newUrl)) {
      setCurrentTrack((prev) => prev ? { ...prev, title: newTitle, url: newUrl || prev.url } : null);
    }
    setPlaylist((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, title: newTitle, url: newUrl || t.url } : t))
    );
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    let nextIdx = currentIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * playlist.length);
    } else if (nextIdx >= playlist.length) {
      nextIdx = 0;
    }
    const nextItem = playlist[nextIdx];
    if (nextItem) {
      setCurrentIndex(nextIdx);
      playTrack(nextItem);
    }
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = playlist.length - 1;
    const prevItem = playlist[prevIdx];
    if (prevItem) {
      setCurrentIndex(prevIdx);
      playTrack(prevItem);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleRepeat = () => setIsRepeat(!isRepeat);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        isRepeat,
        playlist,
        currentIndex,
        playTrack,
        updateTrackTitle,
        togglePlay,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
