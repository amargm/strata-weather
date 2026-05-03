import { API_BASE_URL, owmToInternalCode } from '../utils/constants';
import { WeatherData, WeatherValues, TimelineInterval, DailyInterval, DailyValues, LocationCoords } from '../types/weather';
import { NativeModules, Platform } from 'react-native';

// API key — hardcoded for now, move to env/native module for production
const OWM_API_KEY = 'b12d9d74859cdcec7792ce8c6fe319f1';

// API key override for testing
let _apiKey: string | null = null;
export function setApiKey(key: string) {
  _apiKey = key;
}
function resolveApiKey(): string {
  return _apiKey || OWM_API_KEY;
}

/** Map OWM current weather response to internal WeatherValues */
function mapCurrentWeather(data: any): WeatherValues {
  const main = data.main || {};
  const wind = data.wind || {};
  const clouds = data.clouds || {};
  const weather = data.weather?.[0] || {};
  return {
    temperature: main.temp ?? 0,
    temperatureApparent: main.feels_like ?? main.temp ?? 0,
    humidity: main.humidity ?? 0,
    windSpeed: wind.speed ?? 0,   // m/s
    windDirection: wind.deg ?? 0,
    windGust: wind.gust ?? 0,
    pressureSurfaceLevel: main.pressure ?? 1013,
    cloudCover: clouds.all ?? 0,
    uvIndex: 0, // Not in current weather — filled from One Call if available
    visibility: (data.visibility ?? 10000) / 1000, // m → km
    dewPoint: 0, // Not in basic current — filled from One Call
    precipitationProbability: 0, // Not in current weather
    weatherCode: owmToInternalCode(weather.id ?? 800),
    rainVolume: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
    snowVolume: data.snow?.['1h'] ?? data.snow?.['3h'] ?? 0,
    description: weather.description ?? '',
  };
}

/** Map OWM 5-day/3h forecast item to hourly interval */
function mapHourlyItem(item: any): TimelineInterval {
  const main = item.main || {};
  const wind = item.wind || {};
  const clouds = item.clouds || {};
  const weather = item.weather?.[0] || {};
  return {
    startTime: item.dt_txt || new Date(item.dt * 1000).toISOString(),
    values: {
      temperature: main.temp ?? 0,
      temperatureApparent: main.feels_like ?? main.temp ?? 0,
      humidity: main.humidity ?? 0,
      windSpeed: wind.speed ?? 0,
      windDirection: wind.deg ?? 0,
      windGust: wind.gust ?? 0,
      pressureSurfaceLevel: main.pressure ?? 1013,
      cloudCover: clouds.all ?? 0,
      uvIndex: 0,
      visibility: (item.visibility ?? 10000) / 1000,
      dewPoint: 0,
      precipitationProbability: Math.round((item.pop ?? 0) * 100),
      weatherCode: owmToInternalCode(weather.id ?? 800),
      rainVolume: item.rain?.['3h'] ?? 0,
      snowVolume: item.snow?.['3h'] ?? 0,
      description: weather.description ?? '',
    },
  };
}

/** Aggregate 3-hour forecast items into daily intervals */
function aggregateDaily(items: any[]): DailyInterval[] {
  const dayMap = new Map<string, any[]>();

  for (const item of items) {
    const date = (item.dt_txt || new Date(item.dt * 1000).toISOString()).slice(0, 10);
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(item);
  }

  const dailyIntervals: DailyInterval[] = [];

  for (const [date, dayItems] of dayMap) {
    if (dailyIntervals.length >= 7) break;

    const temps = dayItems.map((d: any) => d.main?.temp ?? 0);
    const humidities = dayItems.map((d: any) => d.main?.humidity ?? 0);
    const winds = dayItems.map((d: any) => d.wind?.speed ?? 0);
    const windDirs = dayItems.map((d: any) => d.wind?.deg ?? 0);
    const pops = dayItems.map((d: any) => Math.round((d.pop ?? 0) * 100));
    // Pick the most significant weather condition (highest OWM id wins for severity)
    const weatherIds = dayItems.map((d: any) => d.weather?.[0]?.id ?? 800);
    const dominantId = weatherIds.reduce((a: number, b: number) => (b > a ? b : a), 800);

    dailyIntervals.push({
      startTime: `${date}T12:00:00Z`,
      values: {
        temperatureMax: Math.max(...temps),
        temperatureMin: Math.min(...temps),
        humidity: Math.round(humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length),
        windSpeed: Math.max(...winds),
        windDirection: Math.round(windDirs.reduce((a: number, b: number) => a + b, 0) / windDirs.length),
        precipitationProbability: Math.max(...pops),
        weatherCode: owmToInternalCode(dominantId),
        uvIndex: 0,
        sunriseTime: '', // Not available in free tier forecast
        sunsetTime: '',
      },
    });
  }

  return dailyIntervals;
}

export async function fetchWeatherData(coords: LocationCoords): Promise<WeatherData> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  const { latitude, longitude } = coords;

  // Fetch current weather + 5-day forecast in parallel
  const [currentRes, forecastRes] = await Promise.all([
    fetch(
      `${API_BASE_URL}/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
    ),
    fetch(
      `${API_BASE_URL}/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
    ),
  ]);

  if (!currentRes.ok) {
    const errorText = await currentRes.text();
    throw new Error(`Weather API error: ${currentRes.status} - ${errorText}`);
  }
  if (!forecastRes.ok) {
    const errorText = await forecastRes.text();
    throw new Error(`Forecast API error: ${forecastRes.status} - ${errorText}`);
  }

  const currentData = await currentRes.json();
  const forecastData = await forecastRes.json();

  const current = mapCurrentWeather(currentData);

  // Sunrise/sunset from current weather response
  const sys = currentData.sys || {};
  const sunriseISO = sys.sunrise ? new Date(sys.sunrise * 1000).toISOString() : '';
  const sunsetISO = sys.sunset ? new Date(sys.sunset * 1000).toISOString() : '';

  // Map 3-hour intervals to hourly (take first 24 = 3 days worth of 3h intervals)
  const forecastItems = forecastData.list || [];
  const hourly = forecastItems.slice(0, 24).map(mapHourlyItem);

  // Aggregate to daily
  const daily = aggregateDaily(forecastItems);

  // Inject sunrise/sunset into today's daily entry
  if (daily.length > 0) {
    daily[0].values.sunriseTime = sunriseISO;
    daily[0].values.sunsetTime = sunsetISO;
  }

  return {
    current,
    hourly,
    daily,
    location: {
      lat: latitude,
      lon: longitude,
      name: currentData.name || '',
    },
  };
}
