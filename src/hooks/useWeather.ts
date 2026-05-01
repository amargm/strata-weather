import { useState, useEffect, useCallback } from 'react';
import { WeatherData, LocationCoords } from '../types/weather';
import { fetchWeatherData } from '../services/weatherApi';

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

  const fetchData = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    try {
      const weather = await fetchWeatherData(coords);
      setData(weather);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
