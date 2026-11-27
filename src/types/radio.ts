export type GenreFilter =
  | 'Todas'
  | 'Favoritas'
  | 'España'
  | 'Noticias/Deportes'
  | 'Rock & Clásicos'
  | 'Hits / Pop'
  | 'Chill / Electrónica';

export type CountryFilter =
  | 'ALL'
  | 'ES'
  | 'GB'
  | 'US'
  | 'FR'
  | 'IT'
  | 'DE'
  | 'AR'
  | 'MX';

export interface BrokenStationEntry {
  id: string;
  name?: string;
  failedAt: number;
}

export interface Station {
  id: string;
  name: string;
  streamUrl: string;
  category: string;
  genreLabel: string;
  description: string;
  logoUrl?: string;
  accentColor: string;
  shortCode: string;
  countryCode?: string;
  votes?: number;
  isHls?: boolean;
  isCustom?: boolean;
  isGlobal?: boolean;
}

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'reconnecting'
  | 'autoplay_blocked'
  | 'error';

export interface EQSettings {
  low: number;   // 100 Hz (-12 to +12 dB)
  mid: number;   // 1000 Hz (-12 to +12 dB)
  high: number;  // 8000 Hz (-12 to +12 dB)
  enabled: boolean;
}
