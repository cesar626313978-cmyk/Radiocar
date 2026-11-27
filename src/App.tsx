/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { AlertCircle } from 'lucide-react';
import { INITIAL_STATIONS } from './data/stations';
import {
  BrokenStationEntry,
  CountryFilter,
  EQSettings,
  GenreFilter,
  PlaybackStatus,
  Station,
} from './types/radio';
import { storageService } from './utils/storage';
import { radioBrowserService } from './services/radioBrowserService';
import { HeaderBar } from './components/HeaderBar';
import { StationBrowser } from './components/StationBrowser';
import { MainPlayer } from './components/MainPlayer';
import { EqualizerModal } from './components/EqualizerModal';
import { AddStationModal } from './components/AddStationModal';

export default function App() {
  // 1. Persisted Catalog, Saved Global Stations, Blacklist & Theme State
  const [customStations, setCustomStations] = useState<Station[]>(() =>
    storageService.getCustomStations()
  );

  const [savedGlobalStations, setSavedGlobalStations] = useState<
    Record<string, Station>
  >(() => storageService.getSavedGlobalStations());

  const [brokenStations, setBrokenStations] = useState<
    Record<string, BrokenStationEntry>
  >(() => storageService.getBrokenStations());

  const [apiStations, setApiStations] = useState<Station[]>([]);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);

  const [themeMode, setThemeMode] = useState<'night' | 'day'>(() =>
    storageService.getThemeMode()
  );

  // Build combined local + saved pool (excluding broken stations)
  const localAndSavedPool = useMemo(() => {
    const map = new Map<string, Station>();
    for (const s of INITIAL_STATIONS) {
      map.set(s.id, s);
    }
    for (const s of customStations) {
      map.set(s.id, s);
    }
    for (const s of Object.values(savedGlobalStations)) {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    }
    return Array.from(map.values());
  }, [customStations, savedGlobalStations]);

  const [currentStation, setCurrentStation] = useState<Station>(() => {
    const savedId = storageService.getLastStationId(INITIAL_STATIONS[0].id);
    const brokenMap = storageService.getBrokenStations();
    const savedGlobals = storageService.getSavedGlobalStations();
    const customs = storageService.getCustomStations();
    const combined = [
      ...INITIAL_STATIONS,
      ...customs,
      ...Object.values(savedGlobals),
    ];

    const found = combined.find((s) => s.id === savedId && !brokenMap[s.id]);
    if (found) return found;

    const firstHealthy = combined.find((s) => !brokenMap[s.id]);
    return firstHealthy || INITIAL_STATIONS[0];
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

  // 2. UI Filter, Toast & Modal State
  const [selectedGenre, setSelectedGenre] = useState<GenreFilter>('Todas');
  const [selectedCountry, setSelectedCountry] = useState<CountryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isEQOpen, setIsEQOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3. Audio Engine Refs & State
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [isWebAudioActive, setIsWebAudioActive] = useState<boolean>(false);
  const [analyserState, setAnalyserState] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playRequestIdRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const playbackTimeoutRef = useRef<number | null>(null);
  const userIntendedPlayingRef = useRef<boolean>(false);
  const consecutiveFailuresRef = useRef<Record<string, number>>({});
  const toastTimerRef = useRef<number | null>(null);

  // Web Audio API Graph Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);

  // Helper to show a discreet toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  // Persist a station into audiocar_saved_stations_v1 whenever played or favorited
  const persistGlobalStation = useCallback((station: Station) => {
    setSavedGlobalStations((prev) => {
      if (prev[station.id]) return prev;
      const next = { ...prev, [station.id]: station };
      storageService.setSavedGlobalStations(next);
      return next;
    });
  }, []);

  // Debounce searchQuery by 350ms for Radio Browser API
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Fetch global stations from Radio Browser API whenever genre, country, or debounced search changes
  useEffect(() => {
    if (selectedGenre === 'Favoritas' && !debouncedQuery.trim()) {
      setIsApiLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsApiLoading(true);

    radioBrowserService
      .queryStations({
        genre: selectedGenre,
        country: selectedCountry,
        searchQuery: debouncedQuery,
        signal: abortController.signal,
      })
      .then((results) => {
        if (!abortController.signal.aborted) {
          setApiStations(results);
          setIsApiLoading(false);
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setIsApiLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [selectedGenre, selectedCountry, debouncedQuery]);

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

  // Filtered and Sorted Stations List (excluding broken stations in audiocar_broken_stations_v1)
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // 1. Filter local/saved stations matching genre, country, query, and NOT in brokenStations
    const matchingLocal = localAndSavedPool.filter((station) => {
      if (brokenStations[station.id]) return false;

      if (selectedCountry !== 'ALL') {
        const stCountry = station.countryCode || 'ES';
        if (stCountry !== selectedCountry) return false;
      }

      const matchesQuery =
        !q ||
        station.name.toLowerCase().includes(q) ||
        station.genreLabel.toLowerCase().includes(q) ||
        station.description.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      if (selectedGenre === 'Favoritas') {
        const hasTime = (playtimeMap[station.id] || 0) > 0;
        const isHearted = favoriteIds.includes(station.id);
        return hasTime || isHearted;
      }

      if (selectedGenre === 'Todas') return true;
      if (selectedGenre === 'España') {
        return (station.countryCode || 'ES') === 'ES';
      }

      return station.category === selectedGenre;
    });

    // If viewing "Favoritas" and not typing a global search, return strictly sorted by playtime
    if (selectedGenre === 'Favoritas' && !q) {
      return [...matchingLocal].sort((a, b) => {
        const timeA = playtimeMap[a.id] || 0;
        const timeB = playtimeMap[b.id] || 0;
        if (timeB !== timeA) return timeB - timeA;
        const favA = favoriteIds.includes(a.id) ? 1 : 0;
        const favB = favoriteIds.includes(b.id) ? 1 : 0;
        return favB - favA;
      });
    }

    // 2. Merge matchingLocal with apiStations (excluding brokenStations and deduplicating by id or streamUrl)
    const merged: Station[] = [];
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();

    for (const s of matchingLocal) {
      seenIds.add(s.id);
      seenUrls.add(s.streamUrl);
      merged.push(s);
    }

    for (const s of apiStations) {
      if (brokenStations[s.id]) continue;
      if (seenIds.has(s.id) || seenUrls.has(s.streamUrl)) continue;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.genreLabel.toLowerCase().includes(q) &&
        !s.description.toLowerCase().includes(q)
      ) {
        continue;
      }
      seenIds.add(s.id);
      seenUrls.add(s.streamUrl);
      merged.push(s);
    }

    return merged;
  }, [
    apiStations,
    brokenStations,
    favoriteIds,
    localAndSavedPool,
    playtimeMap,
    searchQuery,
    selectedCountry,
    selectedGenre,
  ]);

  // Keep a ref to filteredStations so failure skip logic always accesses the latest active list
  const filteredStationsRef = useRef<Station[]>(filteredStations);
  useEffect(() => {
    filteredStationsRef.current = filteredStations;
  }, [filteredStations]);

  // Clear any pending anti-tunnel reconnect timer or 8s timeout watchdog
  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (playbackTimeoutRef.current !== null) {
      window.clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }, []);

  // Destroy any existing HLS instance and pause previous Audio element
  const teardownCurrentAudio = useCallback(() => {
    clearTimers();
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
  }, [clearTimers]);

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

  // Core Atomic Stream Player with CORS fallback, HLS.js, 8s timeout & 3-strike Broken Station Auto-Hide
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
      persistGlobalStation(station);

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

      // Handle stream failure or 8s timeout
      const handleFailureAndRetry = () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (!userIntendedPlayingRef.current) return;

        // If CORS mode failed first, retry immediately once without CORS without penalizing failure count
        if (useCors) {
          startPlayback(station, { isAutoResume: false, useCors: false });
          return;
        }

        // Only count consecutive failures toward the 3-strike blacklist when navigator.onLine === true
        // so driving through tunnels without coverage never blacklists good stations
        const isOnline =
          typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

        if (isOnline) {
          const prevFails = consecutiveFailuresRef.current[station.id] || 0;
          const nextFails = prevFails + 1;
          consecutiveFailuresRef.current[station.id] = nextFails;

          if (nextFails >= 3) {
            // 1. Blacklist station in localStorage (audiocar_broken_stations_v1)
            setBrokenStations((prevBroken) => {
              const updated = {
                ...prevBroken,
                [station.id]: {
                  id: station.id,
                  name: station.name,
                  failedAt: Date.now(),
                },
              };
              storageService.setBrokenStations(updated);

              // 3. Automatically skip to the next healthy station in the list
              const activeList = filteredStationsRef.current.filter(
                (s) => !updated[s.id] && s.id !== station.id
              );
              const fallbackList = INITIAL_STATIONS.filter(
                (s) => !updated[s.id] && s.id !== station.id
              );
              const pool = activeList.length > 0 ? activeList : fallbackList;

              if (pool.length > 0) {
                const nextStation = pool[0];
                window.setTimeout(() => {
                  setCurrentStation(nextStation);
                  storageService.setLastStationId(nextStation.id);
                  startPlayback(nextStation, {
                    isAutoResume: false,
                    useCors: false,
                  });
                }, 150);
              } else {
                setStatus('error');
              }

              return updated;
            });

            // 2. Show discreet toast message
            showToast('Emisora sin señal — ocultada de la lista');
            return;
          }
        }

        setStatus('reconnecting');
        clearTimers();
        reconnectTimerRef.current = window.setTimeout(() => {
          if (
            playRequestIdRef.current === currentToken &&
            userIntendedPlayingRef.current
          ) {
            startPlayback(station, { isAutoResume: false, useCors: false });
          }
        }, 3000);
      };

      // Start 8-second connection watchdog timer while loading
      playbackTimeoutRef.current = window.setTimeout(() => {
        if (playRequestIdRef.current !== currentToken) return;
        if (audio.paused || audio.readyState < 2) {
          handleFailureAndRetry();
        }
      }, 8000);

      const handleSuccessPlaying = () => {
        if (playRequestIdRef.current !== currentToken) return;
        clearTimers();

        // Reset failure count to 0 and remove from broken stations if present
        consecutiveFailuresRef.current[station.id] = 0;
        setBrokenStations((prev) => {
          if (!prev[station.id]) return prev;
          const copy = { ...prev };
          delete copy[station.id];
          storageService.setBrokenStations(copy);
          return copy;
        });

        setStatus('playing');
        updateMediaSession(station, 'playing');
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
              handleSuccessPlaying();
            })
            .catch((err: Error) => {
              if (playRequestIdRef.current !== currentToken) return;
              // Detect Chromium autoplay block on vehicle startup
              if (
                err.name === 'NotAllowedError' ||
                (isAutoResume && err.message?.toLowerCase().includes('interact'))
              ) {
                clearTimers();
                setStatus('autoplay_blocked');
                return;
              }
              handleFailureAndRetry();
            });
        }
      };

      // Attach resilient event listeners
      audio.addEventListener('playing', handleSuccessPlaying);

      audio.addEventListener('waiting', () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (userIntendedPlayingRef.current) {
          setStatus('loading');
        }
      });

      audio.addEventListener('stalled', () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (userIntendedPlayingRef.current && audio.paused) {
          handleFailureAndRetry();
        }
      });

      audio.addEventListener('ended', () => {
        if (playRequestIdRef.current !== currentToken) return;
        if (userIntendedPlayingRef.current) {
          handleFailureAndRetry();
        }
      });

      audio.addEventListener('error', () => {
        if (playRequestIdRef.current !== currentToken) return;
        handleFailureAndRetry();
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
                  handleFailureAndRetry();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  handleFailureAndRetry();
                  break;
              }
            }
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = station.streamUrl;
          attemptPlay();
        } else {
          handleFailureAndRetry();
        }
      } else {
        audio.src = station.streamUrl;
        attemptPlay();
      }
    },
    [
      attachWebAudioGraph,
      clearTimers,
      isMuted,
      persistGlobalStation,
      showToast,
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
      consecutiveFailuresRef.current[station.id] = 0;
      setCurrentStation(station);
      storageService.setLastStationId(station.id);
      persistGlobalStation(station);

      const tryCors =
        station.isHls ||
        eqSettings.low !== 0 ||
        eqSettings.mid !== 0 ||
        eqSettings.high !== 0;
      startPlayback(station, { isAutoResume: false, useCors: tryCors });
    },
    [eqSettings, persistGlobalStation, startPlayback]
  );

  const handleTogglePlay = useCallback(() => {
    if (
      status === 'playing' ||
      status === 'loading' ||
      status === 'reconnecting'
    ) {
      pausePlayback();
    } else {
      consecutiveFailuresRef.current[currentStation.id] = 0;
      const tryCors =
        currentStation.isHls ||
        eqSettings.low !== 0 ||
        eqSettings.mid !== 0 ||
        eqSettings.high !== 0;
      startPlayback(currentStation, { isAutoResume: false, useCors: tryCors });
    }
  }, [currentStation, eqSettings, pausePlayback, startPlayback, status]);

  // Navigate Previous / Next Station (also triggered by Tesla steering wheel buttons)
  const handlePrevStation = useCallback(() => {
    const healthyFallback = INITIAL_STATIONS.filter(
      (s) => !brokenStations[s.id]
    );
    const list =
      filteredStations.length > 0 ? filteredStations : healthyFallback;
    if (list.length === 0) return;

    const idx = list.findIndex((s) => s.id === currentStation.id);
    const prevIndex = idx <= 0 ? list.length - 1 : idx - 1;
    handleSelectStation(list[prevIndex]);
  }, [brokenStations, currentStation.id, filteredStations, handleSelectStation]);

  const handleNextStation = useCallback(() => {
    const healthyFallback = INITIAL_STATIONS.filter(
      (s) => !brokenStations[s.id]
    );
    const list =
      filteredStations.length > 0 ? filteredStations : healthyFallback;
    if (list.length === 0) return;

    const idx = list.findIndex((s) => s.id === currentStation.id);
    const nextIndex = idx === -1 || idx >= list.length - 1 ? 0 : idx + 1;
    handleSelectStation(list[nextIndex]);
  }, [brokenStations, currentStation.id, filteredStations, handleSelectStation]);

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

  // Toggle favorite heart and save full station metadata into audiocar_saved_stations_v1
  const handleToggleFavorite = useCallback(
    (station: Station, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      persistGlobalStation(station);
      setFavoriteIds((prev) => {
        const exists = prev.includes(station.id);
        const next = exists
          ? prev.filter((id) => id !== station.id)
          : [...prev, station.id];
        storageService.setFavoriteIds(next);
        return next;
      });
    },
    [persistGlobalStation]
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
        const firstHealthy =
          INITIAL_STATIONS.find((s) => !brokenStations[s.id]) ||
          INITIAL_STATIONS[0];
        handleSelectStation(firstHealthy);
      }
    },
    [brokenStations, currentStation.id, handleSelectStation]
  );

  // Restore all hidden broken stations with a single tap
  const handleRestoreBrokenStations = useCallback(() => {
    consecutiveFailuresRef.current = {};
    setBrokenStations({});
    storageService.setBrokenStations({});
    showToast('Emisoras ocultas restauradas en la lista');
  }, [showToast]);

  const brokenCount = Object.keys(brokenStations).length;

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-[#F4F6F9] dark:bg-[#121316] text-[#0F172A] dark:text-slate-100 select-none overflow-x-hidden lg:overflow-hidden relative">
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

      {/* Discreet Automotive Toast Alert for Auto-Hidden Broken Stations */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-[#0F172A] dark:bg-[#1C1E22] text-white border border-amber-500/40 shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
            onToggleFavorite={() => handleToggleFavorite(currentStation)}
            listeningSeconds={playtimeMap[currentStation.id] || 0}
            analyser={analyserState}
            isWebAudioActive={isWebAudioActive}
            isDayMode={themeMode === 'day'}
            eqSettings={eqSettings}
            onOpenEQ={() => setIsEQOpen(true)}
            onRetryPlay={() => {
              consecutiveFailuresRef.current[currentStation.id] = 0;
              startPlayback(currentStation, { isAutoResume: false });
            }}
          />
        </div>

        {/* Left Panel on Desktop (40%) / Bottom Panel on Mobile */}
        <div className="w-full lg:w-[40%] lg:order-1 flex flex-col flex-1 min-h-[440px] lg:min-h-0 lg:h-full">
          <StationBrowser
            stations={filteredStations}
            currentStation={currentStation}
            status={status}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectStation={handleSelectStation}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            playtimeMap={playtimeMap}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onDeleteCustomStation={handleDeleteCustomStation}
            isApiLoading={isApiLoading}
            brokenCount={brokenCount}
            onRestoreBrokenStations={handleRestoreBrokenStations}
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
