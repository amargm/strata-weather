import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeatherData } from '../types/weather';

const CACHE_KEY = 'weather_data_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}

export async function getCachedWeather(): Promise<WeatherData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedWeather = JSON.parse(raw);
    return cached.data;
  } catch {
    return null;
  }
}

export async function isCacheStale(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return true;
    const cached: CachedWeather = JSON.parse(raw);
    return Date.now() - cached.timestamp > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

export async function setCachedWeather(data: WeatherData): Promise<void> {
  try {
    const cached: CachedWeather = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Non-critical
  }
}
