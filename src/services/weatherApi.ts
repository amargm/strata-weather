import { API_BASE_URL, WEATHER_FIELDS } from '../utils/constants';
import { WeatherData, WeatherValues, TimelineInterval, DailyInterval, DailyValues, LocationCoords } from '../types/weather';
import { NativeModules, Platform } from 'react-native';

// API key is injected at build time via BuildConfig (Android)
// Exposed to JS via the AppConfig native module
function getApiKey(): string {
  if (Platform.OS === 'android') {
    return (NativeModules?.AppConfig?.WEATHER_API_KEY as string) || '';
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

/** Ensure all WeatherValues fields are valid numbers (API can return null) */
function normalizeWeatherValues(raw: any): WeatherValues {
  return {
    temperature: raw?.temperature ?? 0,
    temperatureApparent: raw?.temperatureApparent ?? raw?.temperature ?? 0,
    humidity: raw?.humidity ?? 0,
    windSpeed: raw?.windSpeed ?? 0,
    windDirection: raw?.windDirection ?? 0,
    windGust: raw?.windGust ?? 0,
    pressureSurfaceLevel: raw?.pressureSurfaceLevel ?? 1013,
    cloudCover: raw?.cloudCover ?? 0,
    uvIndex: raw?.uvIndex ?? 0,
    visibility: raw?.visibility ?? 10,
    dewPoint: raw?.dewPoint ?? 0,
    precipitationProbability: raw?.precipitationProbability ?? 0,
    weatherCode: raw?.weatherCode ?? 1000,
  };
}

/** Ensure all DailyValues fields are valid (API can return null) */
function normalizeDailyValues(raw: any): DailyValues {
  return {
    temperatureMax: raw?.temperatureMax ?? raw?.temperatureMin ?? 0,
    temperatureMin: raw?.temperatureMin ?? raw?.temperatureMax ?? 0,
    humidity: raw?.humidity ?? 0,
    windSpeed: raw?.windSpeed ?? 0,
    windDirection: raw?.windDirection ?? 0,
    precipitationProbability: raw?.precipitationProbability ?? 0,
    weatherCode: raw?.weatherCode ?? 1000,
    uvIndex: raw?.uvIndex ?? 0,
    sunriseTime: raw?.sunriseTime ?? '',
    sunsetTime: raw?.sunsetTime ?? '',
  };
}

function normalizeHourly(items: any[]): TimelineInterval[] {
  return items.map(item => ({
    startTime: item.time || item.startTime || new Date().toISOString(),
    values: normalizeWeatherValues(item.values),
  }));
}

function normalizeDaily(items: any[]): DailyInterval[] {
  return items.map(item => ({
    startTime: item.time || item.startTime || new Date().toISOString(),
    values: normalizeDailyValues(item.values),
  }));
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

  const hourlyIntervals = normalizeHourly(hourly.timelines?.hourly?.slice(0, 24) || []);
  const dailyIntervals = normalizeDaily(daily.timelines?.daily?.slice(0, 7) || []);

  return {
    current: normalizeWeatherValues(realtime.data?.values || realtime.values),
    hourly: hourlyIntervals,
    daily: dailyIntervals,
    location: {
      lat: latitude,
      lon: longitude,
      name: '', // Resolved by reverse geocoding
    },
  };
}
