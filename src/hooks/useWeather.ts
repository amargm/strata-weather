import { useState, useEffect, useCallback } from 'react';
import { WeatherData, LocationCoords } from '../types/weather';
import { fetchWeatherData } from '../services/weatherApi';
import { getCachedWeather, setCachedWeather } from '../services/weatherCache';

interface UseWeatherReturn {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWeather(coords: LocationCoords | null): UseWeatherReturn {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cached data on mount (instant display)
  useEffect(() => {
    getCachedWeather().then((cached) => {
      if (cached && !data) {
        setData(cached);
        setLoading(false);
      }
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!coords) return;
    // Only show loading spinner if we have no data at all
    if (!data) setLoading(true);
    setError(null);
    try {
      const weather = await fetchWeatherData(coords);
      setData(weather);
      setCachedWeather(weather); // persist for next launch
    } catch (err: any) {
      // Only set error if we have no cached data to show
      if (!data) setError(err.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
