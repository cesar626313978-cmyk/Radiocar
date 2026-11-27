import React, { useState } from 'react';
import { PlusCircle, X, Radio } from 'lucide-react';
import { GenreFilter, Station } from '../types/radio';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStation: (station: Station) => void;
}

const CATEGORIES: Exclude<GenreFilter, 'Todas' | 'Favoritas'>[] = [
  'Noticias/Deportes',
  'Rock & Clásicos',
  'Hits / Pop',
  'Chill / Electrónica',
];

export const AddStationModal: React.FC<AddStationModalProps> = ({
  isOpen,
  onClose,
  onAddStation,
}) => {
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [category, setCategory] =
    useState<Exclude<GenreFilter, 'Todas' | 'Favoritas'>>('Hits / Pop');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanUrl = streamUrl.trim();

    if (!cleanName) {
      setError('Introduce el nombre de la emisora.');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError('Introduce una URL de stream válida (https://...).');
      return;
    }

    const isHls = cleanUrl.toLowerCase().includes('.m3u8');
    const shortCode = cleanName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

    const newStation: Station = {
      id: `custom-${Date.now()}`,
      name: cleanName,
      streamUrl: cleanUrl,
      category,
      genreLabel: category,
      description:
        description.trim() || 'Emisora personalizada añadida en el dispositivo.',
      logoUrl: logoUrl.trim() || undefined,
      accentColor: '#4DA8FF',
      shortCode: shortCode || 'FM',
      isHls,
      isCustom: true,
    };

    onAddStation(newStation);
    setName('');
    setStreamUrl('');
    setDescription('');
    setLogoUrl('');
    onClose();
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
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#2A2D34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#4DA8FF]/15 border border-[#93C5FD] dark:border-[#4DA8FF]/30 flex items-center justify-center text-[#0284C7] dark:text-[#4DA8FF]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Añadir Emisora por URL
              </h2>
              <p className="text-xs text-[#475569] dark:text-slate-400">
                Soporta streams directos HTTPS (.mp3, .aac y .m3u8 HLS)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#475569] dark:text-slate-400 hover:bg-[#F4F6F9] dark:hover:bg-[#2A2D34] transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#475569] dark:text-slate-300">
              Nombre de la Emisora *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ibiza Global Radio"
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-sm focus:outline-none focus:border-[#4DA8FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#475569] dark:text-slate-300">
              URL del Stream (MP3 / AAC / HLS .m3u8) *
            </label>
            <input
              type="url"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://..."
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-sm font-mono focus:outline-none focus:border-[#4DA8FF]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#475569] dark:text-slate-300">
                Género / Categoría
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as Exclude<GenreFilter, 'Todas' | 'Favoritas'>
                  )
                }
                className="w-full min-h-[48px] px-3 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-sm focus:outline-none focus:border-[#4DA8FF]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#475569] dark:text-slate-300">
                URL de Logo (Opcional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo.png"
                className="w-full min-h-[48px] px-3 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-sm focus:outline-none focus:border-[#4DA8FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[#475569] dark:text-slate-300">
              Descripción breve (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Música electrónica y sesiones en directo"
              className="w-full min-h-[48px] px-4 rounded-xl bg-[#F4F6F9] dark:bg-[#121316] border border-[#E2E8F0] dark:border-[#2A2D34] text-sm focus:outline-none focus:border-[#4DA8FF]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2D34] text-xs font-semibold text-[#475569] dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-6 rounded-xl bg-[#4DA8FF] hover:bg-[#3b97f2] text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Guardar y Sintonizar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
