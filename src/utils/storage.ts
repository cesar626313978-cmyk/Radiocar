import { EQSettings, Station } from '../types/radio';

const KEYS = {
  LAST_STATION_ID: 'audiocar_last_station_id',
  WAS_PLAYING: 'audiocar_was_playing',
  FAVORITE_IDS: 'audiocar_favorites',
  PLAYTIME_MAP: 'audiocar_playtime_seconds',
  CUSTOM_STATIONS: 'audiocar_custom_stations',
  THEME_MODE: 'audiocar_theme_mode',
  VOLUME: 'audiocar_volume',
  EQ_SETTINGS: 'audiocar_eq_settings',
} as const;

export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSetItem<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private mode errors in automotive browser
  }
}

export const storageService = {
  getLastStationId(defaultId: string): string {
    return safeGetItem<string>(KEYS.LAST_STATION_ID, defaultId);
  },
  setLastStationId(id: string): void {
    safeSetItem(KEYS.LAST_STATION_ID, id);
  },

  getWasPlaying(): boolean {
    return safeGetItem<boolean>(KEYS.WAS_PLAYING, false);
  },
  setWasPlaying(wasPlaying: boolean): void {
    safeSetItem(KEYS.WAS_PLAYING, wasPlaying);
  },

  getFavoriteIds(): string[] {
    return safeGetItem<string[]>(KEYS.FAVORITE_IDS, []);
  },
  setFavoriteIds(ids: string[]): void {
    safeSetItem(KEYS.FAVORITE_IDS, ids);
  },

  getPlaytimeMap(): Record<string, number> {
    return safeGetItem<Record<string, number>>(KEYS.PLAYTIME_MAP, {});
  },
  setPlaytimeMap(map: Record<string, number>): void {
    safeSetItem(KEYS.PLAYTIME_MAP, map);
  },

  getCustomStations(): Station[] {
    return safeGetItem<Station[]>(KEYS.CUSTOM_STATIONS, []);
  },
  setCustomStations(stations: Station[]): void {
    safeSetItem(KEYS.CUSTOM_STATIONS, stations);
  },

  getThemeMode(): 'night' | 'day' {
    return safeGetItem<'night' | 'day'>(KEYS.THEME_MODE, 'night');
  },
  setThemeMode(mode: 'night' | 'day'): void {
    safeSetItem(KEYS.THEME_MODE, mode);
  },

  getVolume(): number {
    return safeGetItem<number>(KEYS.VOLUME, 0.85);
  },
  setVolume(vol: number): void {
    safeSetItem(KEYS.VOLUME, vol);
  },

  getEQSettings(): EQSettings {
    return safeGetItem<EQSettings>(KEYS.EQ_SETTINGS, {
      low: 0,
      mid: 0,
      high: 0,
      enabled: true,
    });
  },
  setEQSettings(eq: EQSettings): void {
    safeSetItem(KEYS.EQ_SETTINGS, eq);
  },
};

/**
 * Formats accumulated listening time in seconds into human-readable telemetry
 * e.g., 45s -> "45s", 180s -> "3m", 4500s -> "1h 15m"
 */
export function formatListeningTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    const remSec = Math.floor(seconds % 60);
    return remSec > 0 && totalMinutes < 10 ? `${totalMinutes}m ${remSec}s` : `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
