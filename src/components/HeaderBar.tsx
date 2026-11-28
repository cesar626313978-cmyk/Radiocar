import React from 'react';
import {
  Radio,
  Home,
  ExternalLink,
  Sliders,
  Sun,
  Moon,
  Wifi,
  Loader2,
  AlertTriangle,
  List,
  Play,
} from 'lucide-react';
import { EQSettings, PlaybackStatus } from '../types/radio';

interface HeaderBarProps {
  status: PlaybackStatus;
  themeMode: 'night' | 'day';
  onToggleTheme: () => void;
  onOpenEQ: () => void;
  eqSettings: EQSettings;
  mobileView: 'player' | 'stations';
  onToggleMobileView: () => void;
  isLandscapeWide: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  status,
  themeMode,
  onToggleTheme,
  onOpenEQ,
  eqSettings,
  mobileView,
  onToggleMobileView,
  isLandscapeWide,
}) => {
  const hasActiveEQ =
    eqSettings.low !== 0 || eqSettings.mid !== 0 || eqSettings.high !== 0;

  // Compact status pill: hidden on narrow phone viewports so phone buttons never overflow,
  // visible in tablet landscape (740px - 1023px) with compact "VIVO" text and on >=1024px with "EN VIVO"
  const renderStatusIndicator = () => {
    if (!isLandscapeWide) return null;

    if (status === 'playing') {
      return (
        <div className="flex items-center gap-1.5 h-8 sm:h-9 lg:h-auto px-2.5 lg:px-3 lg:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 lg:hidden" />
          <Wifi className="hidden lg:block w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="lg:hidden">VIVO</span>
          <span className="hidden lg:inline">EN VIVO</span>
        </div>
      );
    }

    if (status === 'loading') {
      return (
        <div className="flex items-center gap-1.5 h-8 sm:h-9 lg:h-auto px-2.5 lg:px-3 lg:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="lg:hidden">BUFF</span>
          <span className="hidden lg:inline">BUFFERING</span>
        </div>
      );
    }

    if (status === 'reconnecting') {
      return (
        <div className="flex items-center gap-1.5 h-8 sm:h-9 lg:h-auto px-2.5 lg:px-3 lg:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="lg:hidden">RECON</span>
          <span className="hidden lg:inline">RECONECTANDO SEÑAL...</span>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex items-center gap-1.5 h-8 sm:h-9 lg:h-auto px-2.5 lg:px-3 lg:py-1.5 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="lg:hidden">ERROR</span>
          <span className="hidden lg:inline">SIN SEÑAL</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 h-8 sm:h-9 lg:h-auto px-2.5 lg:px-3 lg:py-1.5 rounded-lg sm:rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-[#475569] dark:text-slate-400 text-[11px] sm:text-xs font-mono font-medium whitespace-nowrap shrink-0">
        <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0 lg:hidden" />
        <Wifi className="hidden lg:block w-3.5 h-3.5 opacity-60 shrink-0" />
        <span className="lg:hidden">VIVO</span>
        <span className="hidden lg:inline">STANDBY</span>
      </div>
    );
  };

  return (
    <header className="w-full max-w-full overflow-hidden h-14 sm:h-16 px-2 sm:px-4 lg:px-6 bg-[#FFFFFF] dark:bg-[#1C1E22] border-b border-[#E2E8F0] dark:border-[#2A2D34] flex items-center justify-between gap-1 sm:gap-3 lg:gap-6 shrink-0 z-30">
      {/* Left: Blue Radio icon + short "Radio" on <1024px (incl. tablet landscape 740-1023px), full "AudioCar Radio" on >=1024px + [Inicio] + [VIVO on landscape] */}
      <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-3 shrink-0 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border border-[#93C5FD] dark:border-[#4DA8FF]/30 flex items-center justify-center text-[#0284C7] dark:text-[#4DA8FF] shrink-0">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </div>
          <span className="text-xs sm:text-base lg:text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-white whitespace-nowrap shrink-0">
            <span className="hidden lg:inline">AudioCar </span>
            <span className="text-[#0284C7] dark:text-[#4DA8FF]">Radio</span>
          </span>
        </div>

        <a
          href="https://www.audio-car.es"
          target="_top"
          rel="noopener noreferrer"
          className="h-8 sm:h-9 lg:min-h-[44px] px-2 sm:px-2.5 lg:px-4 rounded-lg sm:rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-[#4DA8FF]/60 text-[11px] sm:text-xs lg:text-sm font-semibold text-[#0F172A] dark:text-slate-200 flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0"
          title="Ir a Audio-Car.es Hub"
        >
          <Home className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#4DA8FF] shrink-0" />
          <span>
            Inicio<span className="hidden lg:inline"> / Hub</span>
          </span>
          <ExternalLink className="hidden lg:block w-3.5 h-3.5 text-[#475569] dark:text-slate-400 shrink-0" />
        </a>

        {renderStatusIndicator()}
      </div>

      {/* Right: Compact buttons on phone/tablet/split-screen: [EQ], [Día/Noche], and blue toggle [☰ Emisoras] / [▶ Reproductor] when !isLandscapeWide */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenEQ}
          className={`h-8 sm:h-9 lg:min-h-[44px] px-1.5 sm:px-2.5 lg:px-4 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs lg:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 lg:gap-2 transition-colors whitespace-nowrap shrink-0 ${
            hasActiveEQ
              ? 'bg-[#EFF6FF] dark:bg-[#4DA8FF]/20 border-[#93C5FD] dark:border-[#4DA8FF] text-[#0F172A] dark:text-white'
              : 'bg-[#F4F6F9] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34] text-[#0F172A] dark:text-slate-200 hover:border-[#93C5FD] dark:hover:border-[#4DA8FF]/50'
          }`}
          aria-label="Abrir Ecualizador de 3 bandas"
        >
          <Sliders className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#0284C7] dark:text-[#4DA8FF] shrink-0" />
          <span className="hidden lg:inline">Ecualizador 3B</span>
          <span className="lg:hidden">EQ</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="h-8 w-8 sm:h-9 sm:w-auto lg:min-h-[44px] sm:px-2.5 lg:px-4 rounded-lg sm:rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-[#4DA8FF]/50 text-[11px] sm:text-xs lg:text-sm font-semibold text-[#0F172A] dark:text-slate-200 flex items-center justify-center gap-1.5 lg:gap-2 transition-colors whitespace-nowrap shrink-0"
          aria-label={
            themeMode === 'night' ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'
          }
          title={
            themeMode === 'night' ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'
          }
        >
          {themeMode === 'night' ? (
            <>
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="hidden lg:inline">Modo Día</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0284C7] shrink-0" />
              <span className="hidden lg:inline">Modo Noche</span>
            </>
          )}
        </button>

        {/* Highlighted Blue View Switcher [☰ Emisoras] / [▶ Reproductor] ONLY when !isLandscapeWide (portrait tablet/phone or narrow Tesla split-screen <740px) */}
        {!isLandscapeWide && (
          <button
            type="button"
            onClick={onToggleMobileView}
            className="h-8 sm:h-9 w-[96px] sm:w-[110px] px-2 rounded-lg sm:rounded-xl bg-[#4DA8FF] hover:bg-[#3b97f2] text-slate-950 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm shadow-[#4DA8FF]/20 whitespace-nowrap shrink-0"
            aria-label={
              mobileView === 'player'
                ? 'Ver lista de emisoras'
                : 'Volver al reproductor'
            }
          >
            {mobileView === 'player' ? (
              <>
                <List className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span>Emisoras</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Reproductor</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
