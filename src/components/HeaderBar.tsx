import React from 'react';
import {
  Radio,
  ExternalLink,
  Sliders,
  Sun,
  Moon,
  Wifi,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { EQSettings, PlaybackStatus } from '../types/radio';

interface HeaderBarProps {
  status: PlaybackStatus;
  themeMode: 'night' | 'day';
  onToggleTheme: () => void;
  onOpenEQ: () => void;
  eqSettings: EQSettings;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  status,
  themeMode,
  onToggleTheme,
  onOpenEQ,
  eqSettings,
}) => {
  const hasActiveEQ =
    eqSettings.low !== 0 || eqSettings.mid !== 0 || eqSettings.high !== 0;

  const renderStatusIndicator = () => {
    if (status === 'playing') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>EN VIVO</span>
        </div>
      );
    }

    if (status === 'loading') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>BUFFERING</span>
        </div>
      );
    }

    if (status === 'reconnecting') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="hidden sm:inline">RECONECTANDO SEÑAL...</span>
          <span className="sm:hidden">RECONECTANDO</span>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>SIN SEÑAL</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-[#475569] dark:text-slate-400 text-xs font-mono font-medium whitespace-nowrap shrink-0">
        <Wifi className="w-3.5 h-3.5 opacity-60 shrink-0" />
        <span>STANDBY</span>
      </div>
    );
  };

  return (
    <header className="w-full h-16 px-3 sm:px-6 bg-[#FFFFFF] dark:bg-[#1C1E22] border-b border-[#E2E8F0] dark:border-[#2A2D34] flex items-center justify-between gap-2 sm:gap-6 shrink-0 z-30">
      {/* Zone 1: Brand Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border border-[#93C5FD] dark:border-[#4DA8FF]/30 flex items-center justify-center text-[#0284C7] dark:text-[#4DA8FF] shrink-0">
          <Radio className="w-5 h-5" />
        </div>
        <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap shrink-0">
          AudioCar <span className="text-[#0284C7] dark:text-[#4DA8FF]">Radio</span>
        </span>
      </div>

      {/* Zone 2: Navigation Link (Inicio / Hub) & Live Signal Indicator */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <a
          href="https://www.audio-car.es"
          target="_top"
          rel="noopener noreferrer"
          className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-[#4DA8FF]/60 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          title="Ir a Audio-Car.es Hub"
        >
          <span>Inicio / Hub</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#475569] dark:text-slate-400 shrink-0" />
        </a>

        {renderStatusIndicator()}
      </div>

      {/* Zone 3: Equalizer 3-Band & Day/Night Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenEQ}
          className={`min-h-[44px] px-3 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
            hasActiveEQ
              ? 'bg-[#EFF6FF] dark:bg-[#4DA8FF]/20 border-[#93C5FD] dark:border-[#4DA8FF] text-[#0F172A] dark:text-white'
              : 'bg-[#F4F6F9] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34] text-[#0F172A] dark:text-slate-200 hover:border-[#93C5FD] dark:hover:border-[#4DA8FF]/50'
          }`}
          aria-label="Abrir Ecualizador de 3 bandas"
        >
          <Sliders className="w-4 h-4 text-[#0284C7] dark:text-[#4DA8FF] shrink-0" />
          <span className="hidden md:inline">Ecualizador 3B</span>
          <span className="md:hidden">EQ</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-[#4DA8FF]/50 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-slate-200 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          aria-label={
            themeMode === 'night' ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'
          }
        >
          {themeMode === 'night' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Modo Día</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#0284C7] shrink-0" />
              <span className="hidden sm:inline">Modo Noche</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
