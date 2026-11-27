export type GenreFilter =
  | 'Todas'
  | 'Favoritas'
  | 'Noticias/Deportes'
  | 'Rock & Clásicos'
  | 'Hits / Pop'
  | 'Chill / Electrónica';

export interface Station {
  id: string;
  name: string;
  streamUrl: string;
  category: Exclude<GenreFilter, 'Todas' | 'Favoritas'>;
  genreLabel: string;
  description: string;
  logoUrl?: string;
  accentColor: string;
  shortCode: string;
  isHls?: boolean;
  isCustom?: boolean;
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
