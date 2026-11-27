import { CountryFilter, GenreFilter, Station } from '../types/radio';

const MIRRORS = [
  'https://de1.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
  'https://at1.api.radio-browser.info/json',
];

const ACCENT_PALETTE = [
  '#4DA8FF',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
];

interface RawRadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  codec: string;
  bitrate: number;
  votes: number;
  hls: number;
}

function pickAccentColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length];
}

function buildShortCode(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'FM';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function mapRawStation(raw: RawRadioBrowserStation): Station | null {
  const cleanName = (raw.name || '').trim();
  const resolvedUrl = (raw.url_resolved || raw.url || '').trim();

  if (!cleanName || !resolvedUrl) return null;

  // Format tags or country for category and genreLabel
  const firstTopics = (raw.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' / ');

  const category = firstTopics || raw.country || 'Internacional';
  const countryDisplay = raw.country || raw.countrycode || 'Global';
  const codecDisplay = raw.codec ? raw.codec.toUpperCase() : 'STREAM';
  const bitrateDisplay = raw.bitrate && raw.bitrate > 0 ? `${raw.bitrate}kbps` : '';

  const descriptionParts = [
    countryDisplay,
    `${codecDisplay}${bitrateDisplay ? ` ${bitrateDisplay}` : ''}`.trim(),
  ].filter(Boolean);

  const isHls =
    raw.hls === 1 || resolvedUrl.toLowerCase().includes('.m3u8');

  const favicon = (raw.favicon || '').trim();
  const safeLogo =
    favicon.startsWith('https://') ? favicon : undefined;

  return {
    id: raw.stationuuid,
    name: cleanName,
    streamUrl: resolvedUrl,
    category,
    genreLabel: firstTopics
      ? `${raw.countrycode ? `[${raw.countrycode}] ` : ''}${firstTopics}`
      : countryDisplay,
    description: descriptionParts.join(' · '),
    logoUrl: safeLogo,
    accentColor: pickAccentColor(raw.stationuuid || cleanName),
    shortCode: buildShortCode(cleanName),
    countryCode: raw.countrycode || undefined,
    votes: raw.votes || 0,
    isHls,
    isGlobal: true,
  };
}

async function fetchWithMirrorFallback(
  endpointPath: string,
  signal?: AbortSignal
): Promise<RawRadioBrowserStation[]> {
  let lastError: Error | null = null;

  for (const baseUrl of MIRRORS) {
    const timeoutController = new AbortController();
    const timeoutId = window.setTimeout(() => timeoutController.abort(), 4000);

    const onExternalAbort = () => timeoutController.abort();
    if (signal) {
      if (signal.aborted) {
        window.clearTimeout(timeoutId);
        throw new DOMException('Aborted', 'AbortError');
      }
      signal.addEventListener('abort', onExternalAbort);
    }

    try {
      const response = await fetch(`${baseUrl}${endpointPath}`, {
        signal: timeoutController.signal,
        headers: {
          Accept: 'application/json',
        },
      });
      window.clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as RawRadioBrowserStation[];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      window.clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);

      if (signal?.aborted) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error('Mirror request failed');
      // Continue automatically to next mirror
    }
  }

  throw lastError || new Error('All Radio Browser mirrors timed out');
}

function normalizeAndSortStations(rawList: RawRadioBrowserStation[]): Station[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  // Sort prioritizing HTTPS streams first, then by votes descending
  const sortedRaw = [...rawList].sort((a, b) => {
    const urlA = (a.url_resolved || a.url || '').trim();
    const urlB = (b.url_resolved || b.url || '').trim();
    const isHttpsA = urlA.startsWith('https://') ? 1 : 0;
    const isHttpsB = urlB.startsWith('https://') ? 1 : 0;
    if (isHttpsB !== isHttpsA) return isHttpsB - isHttpsA;
    return (b.votes || 0) - (a.votes || 0);
  });

  const stations: Station[] = [];
  for (const raw of sortedRaw) {
    const url = (raw.url_resolved || raw.url || '').trim();
    // Filter out non-HTTP(S) and prioritize HTTPS streams to avoid Mixed Content blocks
    if (!url.startsWith('https://')) continue;
    if (seenIds.has(raw.stationuuid) || seenUrls.has(url)) continue;

    const mapped = mapRawStation(raw);
    if (mapped) {
      seenIds.add(raw.stationuuid);
      seenUrls.add(url);
      stations.push(mapped);
    }
  }

  return stations;
}

export const radioBrowserService = {
  async queryStations(params: {
    genre: GenreFilter;
    country: CountryFilter;
    searchQuery: string;
    signal?: AbortSignal;
  }): Promise<Station[]> {
    const { genre, country, searchQuery, signal } = params;
    const q = searchQuery.trim();

    const queryParams = new URLSearchParams({
      hidebroken: 'true',
      order: 'votes',
      reverse: 'true',
      is_https: 'true',
    });

    // If user typed a search query, use /stations/search with limit=80
    if (q.length > 0) {
      queryParams.set('name', q);
      queryParams.set('limit', '80');
      if (country !== 'ALL') {
        queryParams.set('countrycode', country);
      } else if (genre === 'España') {
        queryParams.set('countrycode', 'ES');
      }
      const raw = await fetchWithMirrorFallback(
        `/stations/search?${queryParams.toString()}`,
        signal
      );
      return normalizeAndSortStations(raw);
    }

    // Category & Country routing when search box is empty
    if (genre === 'España' || (genre === 'Todas' && country === 'ES')) {
      queryParams.set('limit', '100');
      const raw = await fetchWithMirrorFallback(
        `/stations/bycountrycodeexact/ES?${queryParams.toString()}`,
        signal
      );
      return normalizeAndSortStations(raw);
    }

    if (genre === 'Todas') {
      if (country !== 'ALL') {
        queryParams.set('limit', '100');
        const raw = await fetchWithMirrorFallback(
          `/stations/bycountrycodeexact/${country}?${queryParams.toString()}`,
          signal
        );
        return normalizeAndSortStations(raw);
      }
      const raw = await fetchWithMirrorFallback(
        `/stations/topvote/100?hidebroken=true`,
        signal
      );
      return normalizeAndSortStations(raw);
    }

    // Map specific genre chips to Radio Browser tags
    const tagByGenre: Record<string, string> = {
      'Noticias/Deportes': 'news',
      'Rock & Clásicos': 'rock',
      'Hits / Pop': 'pop',
      'Chill / Electrónica': 'electronic',
    };

    const targetTag = tagByGenre[genre] || 'pop';
    queryParams.set('tag', targetTag);
    queryParams.set('limit', '100');
    if (country !== 'ALL') {
      queryParams.set('countrycode', country);
    }

    const raw = await fetchWithMirrorFallback(
      `/stations/search?${queryParams.toString()}`,
      signal
    );
    return normalizeAndSortStations(raw);
  },
};
