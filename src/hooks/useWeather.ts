import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherData, LocationCoords } from '../types/weather';
import { fetchWeatherData } from '../services/weatherApi';
import { getCachedWeather, setCachedWeather } from '../services/weatherCache';

interface UseWeatherReturn {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function sameLocation(a: LocationCoords, b: LocationCoords): boolean {
  return a.latitude.toFixed(3) === b.latitude.toFixed(3)
    && a.longitude.toFixed(3) === b.longitude.toFixed(3);
}

export function useWeather(coords: LocationCoords | null): UseWeatherReturn {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    if (!coords) return;
    const request = ++requestId.current;
    setError(null);
    try {
      const weather = await fetchWeatherData(coords);
      if (request !== requestId.current) return;
      setData(weather);
      await setCachedWeather(weather);
    } catch (err: unknown) {
      if (request !== requestId.current) return;
      const message = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(message);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    if (!coords) {
      requestId.current += 1;
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const request = ++requestId.current;
    let active = true;
    setData(null);
    setError(null);
    setLoading(true);

    // Load only a cache entry belonging to this location. Then refresh from
    // OpenWeather so stale data remains useful offline without masquerading
    // as a fresh response.
    const load = async () => {
      const cached = await getCachedWeather(coords);
      if (!active || request !== requestId.current) return;
      if (cached) {
        setData(cached);
        setLoading(false);
      }

      try {
        const weather = await fetchWeatherData(coords);
        if (!active || request !== requestId.current) return;
        setData(weather);
        await setCachedWeather(weather);
        setError(null);
      } catch (err: unknown) {
        if (!active || request !== requestId.current) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
        }
      } finally {
        if (active && request === requestId.current) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [coords?.latitude, coords?.longitude]);

  return { data, loading, error, refresh: fetchData };
}
