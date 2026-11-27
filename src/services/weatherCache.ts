import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationCoords, WeatherData } from '../types/weather';

const CACHE_KEY = 'weather_data_cache_v2';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  data: WeatherData;
  savedAt: number;
  locationKey: string;
}

// Three decimal places is roughly 111 m of latitude. This avoids showing
// another city/location's cached weather while tolerating tiny GPS drift.
function locationKey(coords: LocationCoords): string {
  return `${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
}

function parseCachedWeather(raw: string | null): CachedWeather | null {
  if (!raw) return null;
  try {
    const cached: unknown = JSON.parse(raw);
    if (!cached || typeof cached !== 'object') return null;
    const value = cached as Partial<CachedWeather>;
    if (
      !value.data ||
      typeof value.locationKey !== 'string' ||
      typeof value.savedAt !== 'number' ||
      !Number.isFinite(value.savedAt) ||
      value.savedAt < 0
    ) return null;
    return value as CachedWeather;
  } catch {
    return null;
  }
}

export async function getCachedWeather(coords: LocationCoords): Promise<WeatherData | null> {
  try {
    const cached = parseCachedWeather(await AsyncStorage.getItem(CACHE_KEY));
    if (!cached || cached.locationKey !== locationKey(coords)) return null;
    return cached.data;
  } catch {
    return null;
  }
}

export async function isCacheStale(coords: LocationCoords): Promise<boolean> {
  try {
    const cached = parseCachedWeather(await AsyncStorage.getItem(CACHE_KEY));
    if (!cached || cached.locationKey !== locationKey(coords)) return true;
    return Date.now() - cached.savedAt > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

export async function setCachedWeather(data: WeatherData): Promise<void> {
  try {
    const coords = { latitude: data.location.lat, longitude: data.location.lon };
    const cached: CachedWeather = {
      data,
      savedAt: Date.now(),
      locationKey: locationKey(coords),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Caching is non-critical; a storage failure must not break weather loading.
  }
}
