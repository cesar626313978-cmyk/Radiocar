import React from 'react';
import {
  Search,
  Heart,
  Plus,
  Clock,
  Trash2,
  X,
  Volume2,
} from 'lucide-react';
import { GenreFilter, PlaybackStatus, Station } from '../types/radio';
import { GENRE_FILTERS } from '../data/stations';
import { StationLogo } from './StationLogo';
import { formatListeningTime } from '../utils/storage';

interface StationBrowserProps {
  stations: Station[];
  currentStation: Station;
  status: PlaybackStatus;
  selectedGenre: GenreFilter;
  onSelectGenre: (genre: GenreFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectStation: (station: Station) => void;
  favoriteIds: string[];
  onToggleFavorite: (stationId: string, e: React.MouseEvent) => void;
  playtimeMap: Record<string, number>;
  onOpenAddModal: () => void;
  onDeleteCustomStation: (stationId: string, e: React.MouseEvent) => void;
}

export const StationBrowser: React.FC<StationBrowserProps> = ({
  stations,
  currentStation,
  status,
  selectedGenre,
  onSelectGenre,
  searchQuery,
  onSearchChange,
  onSelectStation,
  favoriteIds,
  onToggleFavorite,
  playtimeMap,
  onOpenAddModal,
  onDeleteCustomStation,
}) => {
  return (
    <aside className="w-full h-full flex flex-col bg-[#FFFFFF] dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-3xl p-4 sm:p-5 overflow-hidden">
      {/* Search Bar & Add Custom Station URL button */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#475569] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar emisora o género..."
            className="w-full min-h-[48px] pl-10 pr-9 rounded-2xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-sm text-[#0F172A] dark:text-slate-100 placeholder-[#475569] dark:placeholder-slate-500 focus:outline-none focus:border-[#4DA8FF]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="min-h-[48px] px-3.5 rounded-2xl bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border border-[#93C5FD] dark:border-[#4DA8FF]/40 text-[#0284C7] dark:text-[#4DA8FF] hover:bg-[#4DA8FF] hover:text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          title="Añadir emisora personalizada por URL"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Añadir URL</span>
        </button>
      </div>

      {/* Genre Filter Interactive Buttons */}
      <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1.5 shrink-0 no-scrollbar">
        {GENRE_FILTERS.map((genre) => {
          const isActive = selectedGenre === genre;
          return (
            <button
              key={genre}
              type="button"
              onClick={() => onSelectGenre(genre)}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#EFF6FF] dark:bg-[#4DA8FF] border-[#93C5FD] dark:border-[#4DA8FF] text-[#0F172A] dark:text-slate-950'
                  : 'bg-[#F4F6F9] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34] text-[#475569] dark:text-slate-300 hover:border-[#93C5FD] dark:hover:border-slate-600'
              }`}
            >
              {genre === 'Favoritas' && (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{genre}</span>
            </button>
          );
        })}
      </div>

      {/* Subtitle helper when viewing Favoritas sorted by device listening time */}
      {selectedGenre === 'Favoritas' && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] flex items-center justify-between text-xs text-[#475569] dark:text-slate-400 shrink-0">
          <span>Ordenadas por tu tiempo de escucha en este dispositivo</span>
          <span className="font-mono font-semibold text-[#0284C7] dark:text-[#4DA8FF]">
            100% Local
          </span>
        </div>
      )}

      {/* Touch-friendly Station List (minimum 56px height per row) */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
        {stations.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center px-4 text-[#475569] dark:text-slate-400">
            <p className="text-sm font-semibold">
              {selectedGenre === 'Favoritas'
                ? 'Todavía no tienes emisoras con tiempo de escucha o marcadas con corazón.'
                : 'No se encontraron emisoras con ese filtro.'}
            </p>
            <p className="text-xs mt-1">
              Sintoniza cualquier emisora para que se ordene automáticamente por tiempo reproducido.
            </p>
          </div>
        ) : (
          stations.map((station, index) => {
            const isSelected = station.id === currentStation.id;
            const isFav = favoriteIds.includes(station.id);
            const secondsPlayed = playtimeMap[station.id] || 0;
            const isPlayingThis = isSelected && status === 'playing';

            return (
              <div
                key={station.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectStation(station)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectStation(station);
                  }
                }}
                className={`w-full min-h-[64px] p-2.5 sm:px-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  isSelected
                    ? 'bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border-[#93C5FD] dark:border-[#4DA8FF] text-[#0F172A] dark:text-white'
                    : 'bg-[#F4F6F9] dark:bg-[#121316] border-[#E2E8F0] dark:border-[#2A2D34] hover:border-[#93C5FD] dark:hover:border-slate-700 text-[#0F172A] dark:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectedGenre === 'Favoritas' && (
                    <span className="w-5 text-center font-mono text-xs font-bold text-[#0284C7] dark:text-[#4DA8FF] shrink-0">
                      #{index + 1}
                    </span>
                  )}

                  <StationLogo station={station} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base truncate">
                        {station.name}
                      </span>
                      {isPlayingThis && (
                        <Volume2 className="w-4 h-4 text-[#0284C7] dark:text-[#4DA8FF] shrink-0" />
                      )}
                    </div>

                    {/* Unboxed clean metadata with · separators */}
                    <div className="flex items-center gap-1.5 text-xs text-[#475569] dark:text-slate-400 truncate">
                      <span className="truncate">{station.genreLabel}</span>
                      {secondsPlayed > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-semibold text-[#0284C7] dark:text-[#4DA8FF] shrink-0">
                            {formatListeningTime(secondsPlayed)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right actions: Delete custom station or Favorite Heart */}
                <div className="flex items-center gap-1 shrink-0">
                  {station.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => onDeleteCustomStation(station.id, e)}
                      className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#475569] dark:text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={`Eliminar ${station.name}`}
                      title="Eliminar emisora personalizada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => onToggleFavorite(station.id, e)}
                    className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition-colors ${
                      isFav
                        ? 'text-rose-500'
                        : 'text-[#475569] dark:text-slate-500 hover:text-rose-500'
                    }`}
                    aria-label={
                      isFav
                        ? `Quitar ${station.name} de favoritas`
                        : `Añadir ${station.name} a favoritas`
                    }
                  >
                    <Heart
                      className="w-5 h-5"
                      fill={isFav ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
