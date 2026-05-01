import { API_BASE_URL, WEATHER_FIELDS } from '../utils/constants';
import { WeatherData, TimelineInterval, DailyInterval, LocationCoords } from '../types/weather';
import { NativeModules, Platform } from 'react-native';

// API key is injected at build time via BuildConfig (Android)
// It is NOT hardcoded in the source
function getApiKey(): string {
  if (Platform.OS === 'android') {
    // Access BuildConfig.WEATHER_API_KEY injected at build time
    return (NativeModules?.BuildConfig?.WEATHER_API_KEY as string) || '';
  }
  return '';
}

// Alternatively use react-native-config for .env file support in development
let _apiKey: string | null = null;

export function setApiKey(key: string) {
  _apiKey = key;
}

function resolveApiKey(): string {
  if (_apiKey) return _apiKey;
  return getApiKey();
}

export async function fetchWeatherData(coords: LocationCoords): Promise<WeatherData> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  const { latitude, longitude } = coords;
  const location = `${latitude},${longitude}`;

  // Fetch realtime + hourly + daily in parallel
  const [realtimeRes, hourlyRes, dailyRes] = await Promise.all([
    fetch(
      `${API_BASE_URL}/weather/realtime?location=${location}&fields=${WEATHER_FIELDS.join(',')}&units=metric`,
      { headers: { apikey: apiKey } }
    ),
    fetch(
      `${API_BASE_URL}/weather/forecast?location=${location}&fields=${WEATHER_FIELDS.join(',')}&timesteps=1h&units=metric`,
      { headers: { apikey: apiKey } }
    ),
    fetch(
      `${API_BASE_URL}/weather/forecast?location=${location}&fields=temperatureMax,temperatureMin,humidity,windSpeed,windDirection,precipitationProbability,weatherCode,uvIndex,sunriseTime,sunsetTime&timesteps=1d&units=metric`,
      { headers: { apikey: apiKey } }
    ),
  ]);

  if (!realtimeRes.ok || !hourlyRes.ok || !dailyRes.ok) {
    const errorText = await realtimeRes.text();
    throw new Error(`Weather API error: ${realtimeRes.status} - ${errorText}`);
  }

  const realtime = await realtimeRes.json();
  const hourly = await hourlyRes.json();
  const daily = await dailyRes.json();

  const hourlyIntervals: TimelineInterval[] = hourly.timelines?.hourly?.slice(0, 24) || [];
  const dailyIntervals: DailyInterval[] = daily.timelines?.daily?.slice(0, 7) || [];

  return {
    current: realtime.data?.values || realtime.values,
    hourly: hourlyIntervals,
    daily: dailyIntervals,
    location: {
      lat: latitude,
      lon: longitude,
      name: '', // Resolved by reverse geocoding
    },
  };
}
