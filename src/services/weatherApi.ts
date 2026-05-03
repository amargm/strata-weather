import { API_BASE_URL, owmToInternalCode } from '../utils/constants';
import { WeatherData, WeatherValues, TimelineInterval, DailyInterval, DailyValues, LocationCoords, AirQuality, GeocodingResult } from '../types/weather';
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
    isNight: typeof weather.icon === 'string' && weather.icon.endsWith('n'),
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
      isNight: (item.sys?.pod === 'n') || (typeof weather.icon === 'string' && weather.icon.endsWith('n')),
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

/** Compute pressure trend from 3-hour forecast items */
function computePressureTrend(items: any[]): 'rising' | 'falling' | 'steady' {
  if (items.length < 3) return 'steady';
  // Compare first 3 items (~9h) pressure trend
  const pressures = items.slice(0, 4).map((d: any) => d.main?.pressure ?? 1013);
  const first = pressures[0];
  const last = pressures[pressures.length - 1];
  const diff = last - first;
  if (diff > 2) return 'rising';
  if (diff < -2) return 'falling';
  return 'steady';
}

/** Fetch air quality data (free OWM endpoint) */
async function fetchAirQuality(lat: number, lon: number, apiKey: string): Promise<AirQuality | undefined> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const item = data.list?.[0];
    if (!item) return undefined;
    return {
      aqi: item.main?.aqi ?? 1,
      co: item.components?.co ?? 0,
      no2: item.components?.no2 ?? 0,
      o3: item.components?.o3 ?? 0,
      pm2_5: item.components?.pm2_5 ?? 0,
      pm10: item.components?.pm10 ?? 0,
      so2: item.components?.so2 ?? 0,
    };
  } catch {
    return undefined; // Non-critical — don't fail the whole fetch
  }
}

/** Derive comfort index from temperature delta + humidity */
function computeComfortIndex(temp: number, feelsLike: number, humidity: number): 'Comfortable' | 'Muggy' | 'Dry' | 'Hot' | 'Cold' {
  if (temp > 35 || feelsLike > 38) return 'Hot';
  if (temp < 5 || feelsLike < 2) return 'Cold';
  if (humidity > 70 && temp > 25) return 'Muggy';
  if (humidity < 30) return 'Dry';
  return 'Comfortable';
}

/** Compute outdoor activity score 0-10 from weather conditions */
function computeOutdoorScore(weather: WeatherValues): number {
  let score = 10;
  // Rain penalty
  if (weather.precipitationProbability > 60) score -= 3;
  else if (weather.precipitationProbability > 30) score -= 1;
  // Wind penalty
  const windKmh = weather.windSpeed * 3.6;
  if (windKmh > 40) score -= 3;
  else if (windKmh > 25) score -= 1;
  // Temperature penalty (too hot or cold)
  if (weather.temperature > 38 || weather.temperature < 0) score -= 3;
  else if (weather.temperature > 34 || weather.temperature < 5) score -= 1;
  // Visibility penalty
  if (weather.visibility < 1) score -= 2;
  else if (weather.visibility < 5) score -= 1;
  // UV penalty
  if (weather.uvIndex > 10) score -= 1;
  return Math.max(0, Math.min(10, score));
}

/** Search cities via OWM Geocoding API */
export async function searchCities(query: string): Promise<GeocodingResult[]> {
  const apiKey = resolveApiKey();
  if (!apiKey || !query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  try {
    const res = await fetch(
      `${API_BASE_URL}/geo/1.0/direct?q=${encoded}&limit=5&appid=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((item: any) => ({
      name: item.name ?? '',
      lat: item.lat ?? 0,
      lon: item.lon ?? 0,
      country: item.country ?? '',
      state: item.state,
    }));
  } catch {
    return [];
  }
}

export async function fetchWeatherData(coords: LocationCoords): Promise<WeatherData> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  const { latitude, longitude } = coords;

  // Fetch current weather + 5-day forecast + air quality in parallel
  const [currentRes, forecastRes, airQuality] = await Promise.all([
    fetch(
      `${API_BASE_URL}/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
    ),
    fetch(
      `${API_BASE_URL}/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
    ),
    fetchAirQuality(latitude, longitude, apiKey),
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
    sunriseTime: sunriseISO,
    sunsetTime: sunsetISO,
    dataTimestamp: currentData.dt ? currentData.dt * 1000 : Date.now(),
    pressureTrend: computePressureTrend(forecastItems),
    airQuality,
    timezoneOffset: currentData.timezone ?? 0,
    cityTempMin: currentData.main?.temp_min,
    cityTempMax: currentData.main?.temp_max,
    seaLevelPressure: currentData.main?.sea_level ?? currentData.main?.pressure,
    comfortIndex: computeComfortIndex(current.temperature, current.temperatureApparent, current.humidity),
    outdoorScore: computeOutdoorScore(current),
  };
}
