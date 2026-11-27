import React from 'react';
import { Sliders, RotateCcw, X } from 'lucide-react';
import { EQSettings } from '../types/radio';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eqSettings: EQSettings;
  onChangeEQ: (next: EQSettings) => void;
  isWebAudioActive: boolean;
}

const PRESETS: { label: string; low: number; mid: number; high: number }[] = [
  { label: 'Plano (0 dB)', low: 0, mid: 0, high: 0 },
  { label: 'Voz / Noticias', low: -3, mid: 5, high: 2 },
  { label: 'Rock & Clásicos', low: 5, mid: -1, high: 4 },
  { label: 'Bass Boost Cabina', low: 7, mid: 0, high: 2 },
];

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  eqSettings,
  onChangeEQ,
  isWebAudioActive,
}) => {
  if (!isOpen) return null;

  const handleBandChange = (band: 'low' | 'mid' | 'high', value: number) => {
    onChangeEQ({
      ...eqSettings,
      [band]: value,
    });
  };

  const handleReset = () => {
    onChangeEQ({
      ...eqSettings,
      low: 0,
      mid: 0,
      high: 0,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#FFFFFF] dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] shadow-2xl p-6 text-[#0F172A] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#2A2D34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border border-[#93C5FD] dark:border-[#4DA8FF]/30 flex items-center justify-center text-[#0284C7] dark:text-[#4DA8FF]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Ecualizador Automotriz 3 Bandas
              </h2>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                {isWebAudioActive
                  ? 'DSP Web Audio API activo en tiempo real'
                  : 'Modo directo anti-CORS activo (priorizando continuidad de señal)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#475569] dark:text-slate-400 hover:bg-[#F4F6F9] dark:hover:bg-[#2A2D34] transition-colors"
            aria-label="Cerrar ecualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets rápidos de cabina */}
        <div className="mt-4">
          <span className="text-xs font-medium text-[#475569] dark:text-slate-400">
            Perfiles acústicos de cabina
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {PRESETS.map((preset) => {
              const isSelected =
                eqSettings.low === preset.low &&
                eqSettings.mid === preset.mid &&
                eqSettings.high === preset.high;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onChangeEQ({
                      ...eqSettings,
                      low: preset.low,
                      mid: preset.mid,
                      high: preset.high,
                    })
                  }
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap truncate ${
                    isSelected
                      ? 'bg-[#EFF6FF] dark:bg-[#4DA8FF]/20 border-[#93C5FD] dark:border-[#4DA8FF] text-[#0F172A] dark:text-white'
                      : 'bg-[#F4F6F9] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34] text-[#475569] dark:text-slate-300 hover:border-[#93C5FD] dark:hover:border-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Band Sliders */}
        <div className="mt-6 space-y-5">
          {[
            {
              key: 'low' as const,
              label: 'Graves (Sub / Woofer)',
              freq: '100 Hz',
              value: eqSettings.low,
            },
            {
              key: 'mid' as const,
              label: 'Medios (Voz / Locución)',
              freq: '1.0 kHz',
              value: eqSettings.mid,
            },
            {
              key: 'high' as const,
              label: 'Agudos (Brillo / Tweeter)',
              freq: '8.0 kHz',
              value: eqSettings.high,
            },
          ].map((band) => (
            <div
              key={band.key}
              className="p-3.5 rounded-2xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34]"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold">{band.label}</span>
                  <span className="ml-2 text-xs text-[#475569] dark:text-slate-400 font-mono">
                    {band.freq}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-[#0284C7] dark:text-[#4DA8FF]">
                  {band.value > 0 ? `+${band.value}` : band.value} dB
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-[#475569] dark:text-slate-500 w-8">
                  -12
                </span>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={band.value}
                  onChange={(e) =>
                    handleBandChange(band.key, Number(e.target.value))
                  }
                  className="w-full h-3 rounded-lg bg-[#E2E8F0] dark:bg-[#2A2D34]"
                />
                <span className="text-[11px] font-mono text-[#475569] dark:text-slate-500 w-8 text-right">
                  +12
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D34] bg-[#F4F6F9] dark:bg-[#121316] text-xs font-semibold text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer 0 dB</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#4DA8FF] hover:bg-[#3b97f2] text-slate-950 font-bold text-sm transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
