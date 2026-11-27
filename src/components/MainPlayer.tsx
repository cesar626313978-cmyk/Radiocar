import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Clock,
  Sliders,
  Radio,
  RotateCw,
} from 'lucide-react';
import { EQSettings, PlaybackStatus, Station } from '../types/radio';
import { StationLogo } from './StationLogo';
import { AudioVisualizer } from './AudioVisualizer';
import { formatListeningTime } from '../utils/storage';

interface MainPlayerProps {
  station: Station;
  status: PlaybackStatus;
  onTogglePlay: () => void;
  onPrevStation: () => void;
  onNextStation: () => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  listeningSeconds: number;
  analyser: AnalyserNode | null;
  isWebAudioActive: boolean;
  isDayMode: boolean;
  eqSettings: EQSettings;
  onOpenEQ: () => void;
  onRetryPlay: () => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({
  station,
  status,
  onTogglePlay,
  onPrevStation,
  onNextStation,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  isFavorite,
  onToggleFavorite,
  listeningSeconds,
  analyser,
  isWebAudioActive,
  isDayMode,
  eqSettings,
  onOpenEQ,
  onRetryPlay,
}) => {
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading' || status === 'reconnecting';

  return (
    <section className="w-full h-full flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-[#FFFFFF] dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-3xl shadow-sm overflow-hidden">
      {/* Top bar of cabin player: metadata + favorite button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <StationLogo station={station} size="xl" isPlaying={isPlaying} />

          <div className="min-w-0">
            {/* Unboxed clean metadata line with · separators */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-[#475569] dark:text-slate-400">
              <span>{station.genreLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {station.isHls ? 'HLS .M3U8' : 'DIRECT HTTPS'}
              </span>
              {listeningSeconds > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className="inline-flex items-center gap-1 font-mono text-[#0284C7] dark:text-[#4DA8FF]"
                    title="Tiempo total reproducido en este dispositivo"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatListeningTime(listeningSeconds)}</span>
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0F172A] dark:text-white truncate">
              {station.name}
            </h1>

            <p className="mt-1.5 text-xs sm:text-sm text-[#475569] dark:text-slate-400 line-clamp-2 max-w-xl">
              {station.description}
            </p>
          </div>
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`min-w-[52px] min-h-[52px] rounded-2xl border flex items-center justify-center transition-colors shrink-0 ${
            isFavorite
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
              : 'bg-[#F4F6F9] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34] text-[#475569] dark:text-slate-400 hover:text-rose-500'
          }`}
          aria-label={
            isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          title={isFavorite ? 'Emisora favorita' : 'Marcar como favorita'}
        >
          <Heart
            className="w-6 h-6 transition-transform active:scale-90"
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Autoplay Blocked Prompt or Reconnecting Banner */}
      {status === 'autoplay_blocked' && (
        <div className="my-3 p-4 rounded-2xl bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border border-[#93C5FD] dark:border-[#4DA8FF] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <Radio className="w-6 h-6 text-[#0284C7] dark:text-[#4DA8FF] shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Memoria de Cabina Lista
              </p>
              <p className="text-xs text-[#475569] dark:text-slate-300">
                Toca para reanudar la última sesión al subir al vehículo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-[#4DA8FF] hover:bg-[#3b97f2] text-slate-950 font-extrabold text-sm whitespace-nowrap shrink-0 transition-transform active:scale-95"
          >
            Sintonizar {station.name}
          </button>
        </div>
      )}

      {(status === 'reconnecting' || status === 'error') && (
        <div className="my-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-semibold">
            <RotateCw className="w-4 h-4 animate-spin shrink-0" />
            <span>
              {status === 'reconnecting'
                ? 'Reconectando señal automáticamente cada 3s...'
                : 'Señal interrumpida. Reintentando conexión...'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRetryPlay}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold whitespace-nowrap shrink-0"
          >
            Reintentar ahora
          </button>
        </div>
      )}

      {/* Real-time Audio Waveform Visualizer */}
      <div className="my-3 sm:my-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium text-[#475569] dark:text-slate-400">
            Espectro de Onda en Tiempo Real
          </span>
          <button
            type="button"
            onClick={onOpenEQ}
            className="text-xs font-mono text-[#0284C7] dark:text-[#4DA8FF] hover:underline flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>
              EQ: {eqSettings.low >= 0 ? `+${eqSettings.low}` : eqSettings.low} /{' '}
              {eqSettings.mid >= 0 ? `+${eqSettings.mid}` : eqSettings.mid} /{' '}
              {eqSettings.high >= 0 ? `+${eqSettings.high}` : eqSettings.high} dB
            </span>
          </button>
        </div>

        <AudioVisualizer
          analyser={analyser}
          status={status}
          accentColor={station.accentColor}
          isWebAudioActive={isWebAudioActive}
          isDayMode={isDayMode}
        />
      </div>

      {/* Primary Transport Controls: Giant Play/Pause + Prev/Next */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-5 sm:gap-8">
          <button
            type="button"
            onClick={onPrevStation}
            className="min-w-[60px] min-h-[60px] sm:min-w-[68px] sm:min-h-[68px] rounded-2xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-[#4DA8FF] text-[#0F172A] dark:text-slate-100 flex items-center justify-center transition-transform active:scale-95"
            aria-label="Emisora Anterior"
            title="Emisora Anterior (Volante ⏮)"
          >
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="min-w-[84px] min-h-[84px] sm:min-w-[96px] sm:min-h-[96px] px-8 rounded-3xl bg-[#4DA8FF] hover:bg-[#3b97f2] text-slate-950 font-extrabold flex items-center justify-center gap-3 shadow-lg shadow-[#4DA8FF]/20 transition-transform active:scale-95"
            aria-label={isPlaying ? 'Pausar emisora' : 'Reproducir emisora'}
          >
            {isPlaying || isLoading ? (
              <Pause className="w-10 h-10 fill-current" />
            ) : (
              <Play className="w-10 h-10 fill-current ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={onNextStation}
            className="min-w-[60px] min-h-[60px] sm:min-w-[68px] sm:min-h-[68px] rounded-2xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-[#4DA8FF] text-[#0F172A] dark:text-slate-100 flex items-center justify-center transition-transform active:scale-95"
            aria-label="Emisora Siguiente"
            title="Emisora Siguiente (Volante ⏭)"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>

        {/* Bottom Volume Bar & MediaSession Status */}
        <div className="flex items-center gap-4 pt-3 border-t border-[#E2E8F0] dark:border-[#2A2D34]">
          <button
            type="button"
            onClick={onToggleMute}
            className="min-w-[48px] min-h-[48px] rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] flex items-center justify-center text-[#0F172A] dark:text-slate-200 hover:border-[#93C5FD] dark:hover:border-[#4DA8FF] transition-colors shrink-0"
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-rose-500" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#0284C7] dark:text-[#4DA8FF]" />
            )}
          </button>

          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-full h-3 rounded-lg bg-[#E2E8F0] dark:bg-[#2A2D34]"
              aria-label="Control de volumen"
            />
            <span className="w-12 text-right font-mono text-xs font-bold text-[#475569] dark:text-slate-300">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
