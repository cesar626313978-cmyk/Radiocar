import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import { Station } from '../types/radio';

interface StationLogoProps {
  station: Station;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPlaying?: boolean;
}

export const StationLogo: React.FC<StationLogoProps> = ({
  station,
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dimensions = {
    sm: 'w-11 h-11 rounded-xl text-xs',
    md: 'w-13 h-13 rounded-xl text-sm',
    lg: 'w-20 h-20 rounded-2xl text-xl',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl text-2xl',
  }[size];

  const showFallback = !station.logoUrl || imgFailed;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center overflow-hidden select-none border transition-transform duration-200 ${dimensions} bg-[#FFFFFF] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34]`}
    >
      {/* Subtle ambient background tint using station accent color */}
      <div
        className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${station.accentColor}, transparent 75%)`,
        }}
      />

      {!showFallback ? (
        <img
          src={station.logoUrl}
          alt={`Logo de ${station.name}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="relative z-10 w-3/4 h-3/4 object-contain drop-shadow-sm"
        />
      ) : (
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          {/* Custom SVG automotive dial crest */}
          <svg
            viewBox="0 0 64 64"
            className="absolute inset-0 w-full h-full opacity-20"
            fill="none"
          >
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke={station.accentColor}
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx="32"
              cy="32"
              r="18"
              stroke={station.accentColor}
              strokeWidth="1.5"
            />
          </svg>
          <span
            className="font-mono font-bold tracking-tight z-10"
            style={{ color: station.accentColor }}
          >
            {station.shortCode || station.name.slice(0, 3).toUpperCase()}
          </span>
          {(size === 'lg' || size === 'xl') && (
            <Radio
              className="w-4 h-4 mt-1 opacity-60"
              style={{ color: station.accentColor }}
            />
          )}
        </div>
      )}
    </div>
  );
};
