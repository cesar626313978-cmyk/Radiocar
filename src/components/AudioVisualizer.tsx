import React, { useEffect, useRef } from 'react';
import { PlaybackStatus } from '../types/radio';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  status: PlaybackStatus;
  accentColor: string;
  isWebAudioActive: boolean;
  isDayMode: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  status,
  accentColor,
  isWebAudioActive,
  isDayMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const barCount = 42;
    const frequencyData = new Uint8Array(analyser ? analyser.frequencyBinCount : 64);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      let hasLiveFFT = false;
      if (status === 'playing' && analyser && isWebAudioActive) {
        analyser.getByteFrequencyData(frequencyData);
        // Check if frequencyData contains non-zero signal (CORS might zero-fill silently on some browsers)
        let sum = 0;
        for (let i = 0; i < 24; i++) {
          sum += frequencyData[i];
        }
        hasLiveFFT = sum > 0;
      }

      phaseRef.current += status === 'playing' ? 0.085 : 0.02;

      const totalGap = (barCount - 1) * 4;
      const barWidth = Math.max(3, (width - totalGap) / barCount);
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        let normalizedAmplitude = 0.08;

        if (status === 'playing') {
          if (hasLiveFFT) {
            const binIndex = Math.min(
              frequencyData.length - 1,
              Math.floor((i / barCount) * (frequencyData.length * 0.65))
            );
            normalizedAmplitude = Math.max(0.08, frequencyData[binIndex] / 255);
          } else {
            // Dynamic acoustic envelope simulation when stream server omits CORS headers
            const centerDist = 1 - Math.abs((i - barCount / 2) / (barCount / 2)) * 0.55;
            const wave1 = Math.sin(phaseRef.current * 1.4 + i * 0.35);
            const wave2 = Math.cos(phaseRef.current * 0.9 - i * 0.22);
            const wave3 = Math.sin(phaseRef.current * 2.3 + i * 0.65);
            const combined = (wave1 * 0.4 + wave2 * 0.35 + wave3 * 0.25 + 1) / 2;
            normalizedAmplitude = Math.max(0.1, Math.min(0.95, combined * centerDist));
          }
        } else if (status === 'loading' || status === 'reconnecting') {
          // Scanning pulse wave during buffering / tunnel recovery
          const pulse = (Math.sin(phaseRef.current * 2 - i * 0.25) + 1) / 2;
          normalizedAmplitude = 0.12 + pulse * 0.28;
        } else {
          // Idle subtle baseline
          normalizedAmplitude = 0.07;
        }

        const barHeight = Math.max(4, normalizedAmplitude * (height * 0.84));
        const x = i * (barWidth + 4);
        const y = centerY - barHeight / 2;

        // Color & opacity orchestration
        if (status === 'playing') {
          ctx.fillStyle = i % 3 === 0 ? '#4DA8FF' : accentColor || '#4DA8FF';
          ctx.globalAlpha = 0.45 + normalizedAmplitude * 0.55;
        } else if (status === 'loading' || status === 'reconnecting') {
          ctx.fillStyle = '#F59E0B';
          ctx.globalAlpha = 0.6;
        } else {
          ctx.fillStyle = isDayMode ? '#CBD5E1' : '#2A2D34';
          ctx.globalAlpha = 0.85;
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 999);
        ctx.fill();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser, status, accentColor, isWebAudioActive, isDayMode]);

  return (
    <div className="relative w-full h-14 sm:h-16 lg:h-24 flex items-center justify-center px-3 py-1.5 lg:py-2 rounded-2xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-label="Visualizador de onda de audio en tiempo real"
      />
    </div>
  );
};
