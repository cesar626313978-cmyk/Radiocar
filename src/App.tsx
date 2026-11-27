/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { INITIAL_STATIONS } from './data/stations';
import { EQSettings, GenreFilter, PlaybackStatus, Station } from './types/radio';
import { storageService } from './utils/storage';
import { HeaderBar } from './components/HeaderBar';
import { StationBrowser } from './components/StationBrowser';
import { MainPlayer } from './components/MainPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { AddStationModal } from './components/AddStationModal';

export default function App() {
  // 1. Persisted Catalog & Theme State
  const [customStations, setCustomStations] = useState<Station[]>(() =>
    storageService.getCustomStations()
  );
  const allStations = useMemo(
    () => [...INITIAL_STATIONS, ...customStations],
    [customStations]
  );

  const [themeMode, setThemeMode] = useState<'night' | 'day'>(() =>
    storageService.getThemeMode()
  );

  const [currentStation, setCurrentStation] = useState<Station>(() => {
    const savedId = storageService.getLastStationId(INITIAL_STATIONS[0].id);
    const found = [...INITIAL_STATIONS, ...storageService.getCustomStations()].find(
      (s) => s.id === savedId
    );
    return found || INITIAL_STATIONS[0];
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    storageService.getFavoriteIds()
  );

  const [playtimeMap, setPlaytimeMap] = useState<Record<string, number>>(() =>
    storageService.getPlaytimeMap()
  );

  const [volume, setVolume] = useState<number>(() => storageService.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [eqSettings, setEqSettings] = useState<EQSettings>(() =>
    storageService.getEQSettings()
  );

  // 2. UI Filter & Modal State
  const [selectedGenre, setSelectedGenre] = useState<GenreFilter>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEQOpen, setIsEQOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // 3. Audio Engine Refs & State
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [isWebAudioActive, setIsWebAudioActive] = useState<boolean>(false);
  const [analyserState, setAnalyserState] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playRequestIdRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const userIntendedPlayingRef = useRef<boolean>(false);

  // Web Audio API Graph Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);

  // Sync themeMode with <html class="dark"> and body background
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'night') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#121316';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F4F6F9';
    }
    storageService.setThemeMode(themeMode);
  }, [themeMode]);

  // Update BiquadFilter gains whenever eqSettings changes
  useEffect(() => {
    storageService.setEQSettings(eqSettings);
    if (lowFilterRef.current && midFilterRef.current && highFilterRef.current) {
      const lowGain = eqSettings.enabled ? eqSettings.low : 0;
      const midGain = eqSettings.enabled ? eqSettings.mid : 0;
      const highGain = eqSettings.enabled ? eqSettings.high : 0;

      lowFilterRef.current.gain.value = lowGain;
      midFilterRef.current.gain.value = midGain;
      highFilterRef.current.gain.value = highGain;
    }
  }, [eqSettings]);

  // Sync volume with active HTMLAudioElement
  useEffect(() => {
    storageService.setVolume(volume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Increment device listening time every 1 second while playing (100% local in localStorage)
  useEffect(() => {
    if (status !== 'playing') return;

    const intervalId = window.setInterval(() => {
      setPlaytimeMap((prev) => {
        const nextVal = (prev[currentStation.id] || 0) + 1;
        const nextMap = { ...prev, [currentStation.id]: nextVal };
        storageService.setPlaytimeMap(nextMap);
        return nextMap;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status, currentStation.id]);

  // Clear any pending anti-tunnel reconnect timer
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // Destroy any existing HLS instance and pause previous Audio element
  const teardownCurrentAudio = useCallback(() => {
    clearReconnectTimer();
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // Ignore hls destroy error
      }
      hlsRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {
        // Ignore audio reset errors
      }
      audioRef.current = null;
    }
  }, [clearReconnectTimer]);

  // Update Tesla MediaSession metadata & playback state
  const updateMediaSession = useCallback(
    (station: Station, playbackState: 'playing' | 'paused') => {
      try {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: `AudioCar Radio · ${station.genreLabel}`,
            album: station.description,
            artwork: station.logoUrl
              ? [
                  {
                    src: station.logoUrl,
                    sizes: '192x192',
                    type: 'image/png',
                  },
                ]
              : [],
          });
          navigator.mediaSession.playbackState = playbackState;
        }
      } catch {
        // Ignore MediaSession errors on older browsers
      }
    },
    []
  );

  // Connect HTMLAudioElement to Web Audio API 3-band EQ + Analyser if CORS mode is enabled
  const attachWebAudioGraph = useCallback(
    (audioEl: HTMLAudioElement) => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return false;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const source = ctx.createMediaElementSource(audioEl);

        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf';
        low.frequency.value = 100;
        low.gain.value = eqSettings.enabled ? eqSettings.low : 0;

        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1000;
        mid.Q.value = 1.0;
        mid.gain.value = eqSettings.enabled ? eqSettings.mid : 0;

        const high = ctx.createBiquadFilter();
        high.type = 'highshelf';
        high.frequency.value = 8000;
        high.gain.value = eqSettings.enabled ? eqSettings.high : 0;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.78;

        source.connect(low);
        low.connect(mid);
        mid.connect(high);
        high.connect(analyser);
        analyser.connect(ctx.destination);

        lowFilterRef.current = low;
        midFilterRef.current = mid;
        highFilterRef.current = high;
        setAnalyserState(analyser);
        setIsWebAudioActive(true);
        return true;
      } catch {
        setIsWebAudioActive(false);
        return false;
      }
    },
    [eqSettings]
  );

  // Core Atomic Stream Player with CORS fallback, HLS.js support & 3-second Anti-Tunnel Reconnection
  const startPlayback = useCallback(
    (
      station: Station,
      options: { isAutoResume?: boolean; useCors?: boolean } = {}
    ) => {
      const { isAutoResume = false, useCors = false } = options;

      // Increment atomic request token to immediately invalidate any previous in-flight requests
      playRequestIdRef.current += 1;
      const currentToken = playRequestIdRef.current;

      teardownCurrentAudio();

      userIntendedPlayingRef.current = true;
      storageService.setLastStationId(station.id);
      storageService.setWasPlaying(true);

      setStatus((prev) =>
        prev === 'reconnecting' ? 'reconnecting' : 'loading'
      );

      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = isMuted ? 0 : volume;

      if (useCors) {
        audio.crossOrigin = 'anonymous';
      } else {
        setIsWebAudioActive(false);
      }

      audioRef.current = audio;

      const scheduleReconnect = () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (!userIntendedPlayingRef.current) return;

        // If CORS mode failed first, immediately retry once without CORS before entering 3s tunnel loop
        if (useCors) {
          startPlayback(station, { isAutoResume: false, useCors: false });
          return;
        }

        setStatus('reconnecting');
        clearReconnectTimer();
        reconnectTimerRef.current = window.setTimeout(() => {
          if (
            playRequestIdRef.current === currentToken &&
            userIntendedPlayingRef.current
          ) {
            startPlayback(station, { isAutoResume: false, useCors: false });
          }
        }, 3000);
      };

      const attemptPlay = () => {
        if (playRequestIdRef.current !== currentToken) return;

        if (useCors) {
          attachWebAudioGraph(audio);
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (playRequestIdRef.current !== currentToken) {
                audio.pause();
                return;
              }
              clearReconnectTimer();
              setStatus('playing');
              updateMediaSession(station, 'playing');
            })
            .catch((err: Error) => {
              if (playRequestIdRef.current !== currentToken) return;
              // Detect Chromium autoplay block on vehicle startup
              if (
                err.name === 'NotAllowedError' ||
                (isAutoResume && err.message?.toLowerCase().includes('interact'))
              ) {
                setStatus('autoplay_blocked');
                return;
              }
              scheduleReconnect();
            });
        }
      };

      // Attach resilient event listeners
      audio.addEventListener('playing', () => {
        if (playRequestIdRef.current !== currentToken) return;
        clearReconnectTimer();
        setStatus('playing');
        updateMediaSession(station, 'playing');
      });

      audio.addEventListener('waiting', () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (userIntendedPlayingRef.current) {
          setStatus('loading');
        }
      });

      audio.addEventListener('stalled', () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (userIntendedPlayingRef.current && audio.paused) {
          scheduleReconnect();
        }
      });

      audio.addEventListener('ended', () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (userIntendedPlayingRef.current) {
          scheduleReconnect();
        }
      });

      audio.addEventListener('error', () => {
        if (playRequestIdRef.current !== currentToken) return;
        scheduleReconnect();
      });

      const isHlsStream =
        station.isHls || station.streamUrl.toLowerCase().includes('.m3u8');

      if (isHlsStream) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;
          hls.loadSource(station.streamUrl);
          hls.attachMedia(audio);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (playRequestIdRef.current !== currentToken) {
              hls.destroy();
              return;
            }
            attemptPlay();
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (playRequestIdRef.current !== currentToken) return;
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  scheduleReconnect();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  scheduleReconnect();
                  break;
              }
            }
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = station.streamUrl;
          attemptPlay();
        } else {
          setStatus('error');
        }
      } else {
        audio.src = station.streamUrl;
        attemptPlay();
      }
    },
    [
      attachWebAudioGraph,
      clearReconnectTimer,
      isMuted,
      teardownCurrentAudio,
      updateMediaSession,
      volume,
    ]
  );

  // Stop / Pause active playback cleanly
  const pausePlayback = useCallback(() => {
    playRequestIdRef.current += 1;
    userIntendedPlayingRef.current = false;
    storageService.setWasPlaying(false);
    teardownCurrentAudio();
    setStatus('paused');
    updateMediaSession(currentStation, 'paused');
  }, [currentStation, teardownCurrentAudio, updateMediaSession]);

  // Select a new station and play immediately (atomic switch)
  const handleSelectStation = useCallback(
    (station: Station) => {
      setCurrentStation(station);
      storageService.setLastStationId(station.id);
      // Try Web Audio CORS mode first if it's HLS (like Onda Cero) or if user adjusted EQ
      const tryCors =
        station.isHls ||
        eqSettings.low !== 0 ||
        eqSettings.mid !== 0 ||
        eqSettings.high !== 0;
      startPlayback(station, { isAutoResume: false, useCors: tryCors });
    },
    [eqSettings, startPlayback]
  );

  const handleTogglePlay = useCallback(() => {
    if (
      status === 'playing' ||
      status === 'loading' ||
      status === 'reconnecting'
    ) {
      pausePlayback();
    } else {
      const tryCors =
        currentStation.isHls ||
        eqSettings.low !== 0 ||
        eqSettings.mid !== 0 ||
        eqSettings.high !== 0;
      startPlayback(currentStation, { isAutoResume: false, useCors: tryCors });
    }
  }, [currentStation, eqSettings, pausePlayback, startPlayback, status]);

  // Filtered and Sorted Stations List
  // When "Favoritas" is active, sorts strictly by accumulated device listening time descending
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = allStations.filter((station) => {
      const matchesQuery =
        !q ||
        station.name.toLowerCase().includes(q) ||
        station.genreLabel.toLowerCase().includes(q) ||
        station.description.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (selectedGenre === 'Todas') return true;
      if (selectedGenre === 'Favoritas') {
        const hasTime = (playtimeMap[station.id] || 0) > 0;
        const isHearted = favoriteIds.includes(station.id);
        return hasTime || isHearted;
      }
      return station.category === selectedGenre;
    });

    if (selectedGenre === 'Favoritas') {
      return [...list].sort((a, b) => {
        const timeA = playtimeMap[a.id] || 0;
        const timeB = playtimeMap[b.id] || 0;
        if (timeB !== timeA) return timeB - timeA;
        const favA = favoriteIds.includes(a.id) ? 1 : 0;
        const favB = favoriteIds.includes(b.id) ? 1 : 0;
        return favB - favA;
      });
    }

    return list;
  }, [allStations, favoriteIds, playtimeMap, searchQuery, selectedGenre]);

  // Navigate Previous / Next Station (also triggered by Tesla steering wheel buttons)
  const handlePrevStation = useCallback(() => {
    const list = filteredStations.length > 0 ? filteredStations : allStations;
    const idx = list.findIndex((s) => s.id === currentStation.id);
    const prevIndex = idx <= 0 ? list.length - 1 : idx - 1;
    handleSelectStation(list[prevIndex]);
  }, [allStations, currentStation.id, filteredStations, handleSelectStation]);

  const handleNextStation = useCallback(() => {
    const list = filteredStations.length > 0 ? filteredStations : allStations;
    const idx = list.findIndex((s) => s.id === currentStation.id);
    const nextIndex = idx === -1 || idx >= list.length - 1 ? 0 : idx + 1;
    handleSelectStation(list[nextIndex]);
  }, [allStations, currentStation.id, filteredStations, handleSelectStation]);

  // Register Tesla Steering Wheel MediaSession Action Handlers
  useEffect(() => {
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          startPlayback(currentStation, { isAutoResume: false });
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          pausePlayback();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrevStation();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNextStation();
        });
      }
    } catch {
      // Ignore unsupported mediaSession handlers
    }
  }, [
    currentStation,
    handleNextStation,
    handlePrevStation,
    pausePlayback,
    startPlayback,
  ]);

  // Vehicle Entry Auto-Resume on Initial Mount
  useEffect(() => {
    const wasPlaying = storageService.getWasPlaying();
    if (wasPlaying) {
      startPlayback(currentStation, { isAutoResume: true });
    }
    return () => {
      teardownCurrentAudio();
    };
    // Only run on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle favorite heart
  const handleToggleFavorite = useCallback(
    (stationId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setFavoriteIds((prev) => {
        const exists = prev.includes(stationId);
        const next = exists
          ? prev.filter((id) => id !== stationId)
          : [...prev, stationId];
        storageService.setFavoriteIds(next);
        return next;
      });
    },
    []
  );

  // Add custom station by URL
  const handleAddCustomStation = useCallback(
    (newStation: Station) => {
      setCustomStations((prev) => {
        const next = [newStation, ...prev];
        storageService.setCustomStations(next);
        return next;
      });
      handleSelectStation(newStation);
    },
    [handleSelectStation]
  );

  // Delete custom station
  const handleDeleteCustomStation = useCallback(
    (stationId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setCustomStations((prev) => {
        const next = prev.filter((s) => s.id !== stationId);
        storageService.setCustomStations(next);
        return next;
      });
      if (currentStation.id === stationId) {
        handleSelectStation(INITIAL_STATIONS[0]);
      }
    },
    [currentStation.id, handleSelectStation]
  );

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#F4F6F9] dark:bg-[#121316] text-[#0F172A] dark:text-slate-100 select-none overflow-x-hidden lg:overflow-hidden">
      {/* Compact Automotive Top Header Bar */}
      <HeaderBar
        status={status}
        themeMode={themeMode}
        onToggleTheme={() =>
          setThemeMode((prev) => (prev === 'night' ? 'day' : 'night'))
        }
        onOpenEQ={() => setIsEQOpen(true)}
        eqSettings={eqSettings}
      />

      {/* Main Split Cabin Layout:
          - Mobile Vertical (<1024px): Vertical Split View (Main Player on Top, Station List on Bottom)
          - Tesla Widescreen (>=1024px): Left Panel 40% (Stations) / Right Panel 60% (Main Player)
      */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 lg:overflow-hidden">
        {/* Right Panel on Desktop (60%) / Top Panel on Mobile */}
        <div className="w-full lg:w-[60%] lg:order-2 flex flex-col shrink-0 lg:h-full">
          <MainPlayer
            station={currentStation}
            status={status}
            onTogglePlay={handleTogglePlay}
            onPrevStation={handlePrevStation}
            onNextStation={handleNextStation}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={(v) => {
              setIsMuted(false);
              setVolume(v);
            }}
            onToggleMute={() => setIsMuted((m) => !m)}
            isFavorite={favoriteIds.includes(currentStation.id)}
            onToggleFavorite={() => handleToggleFavorite(currentStation.id)}
            listeningSeconds={playtimeMap[currentStation.id] || 0}
            analyser={analyserState}
            isWebAudioActive={isWebAudioActive}
            isDayMode={themeMode === 'day'}
            eqSettings={eqSettings}
            onOpenEQ={() => setIsEQOpen(true)}
            onRetryPlay={() =>
              startPlayback(currentStation, { isAutoResume: false })
            }
          />
        </div>

        {/* Left Panel on Desktop (40%) / Bottom Panel on Mobile */}
        <div className="w-full lg:w-[40%] lg:order-1 flex flex-col flex-1 min-h-[420px] lg:min-h-0 lg:h-full">
          <StationBrowser
            stations={filteredStations}
            currentStation={currentStation}
            status={status}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectStation={handleSelectStation}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            playtimeMap={playtimeMap}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onDeleteCustomStation={handleDeleteCustomStation}
          />
        </div>
      </main>

      {/* 3-Band Equalizer Modal */}
      <EqualizerModal
        isOpen={isEQOpen}
        onClose={() => setIsEQOpen(false)}
        eqSettings={eqSettings}
        onChangeEQ={setEqSettings}
        isWebAudioActive={isWebAudioActive}
      />

      {/* Add Custom Station by URL Modal */}
      <AddStationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStation={handleAddCustomStation}
      />
    </div>
  );
}
