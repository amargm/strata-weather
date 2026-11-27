import { API_BASE_URL, owmToInternalCode } from '../utils/constants';
import { WeatherData, WeatherValues, TimelineInterval, DailyInterval, DailyValues, LocationCoords, AirQuality, GeocodingResult } from '../types/weather';

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

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('OpenWeather response is missing a valid ' + field);
  }
  return value;
}

/** Map OWM current weather response to internal WeatherValues */
function mapCurrentWeather(data: any): WeatherValues {
  const main = data.main || {};
  const wind = data.wind || {};
  const clouds = data.clouds || {};
  const weather = data.weather?.[0] || {};
  return {
    temperature: requiredNumber(main.temp, 'temperature'),
    temperatureApparent: requiredNumber(main.feels_like, 'feels-like temperature'),
    humidity: requiredNumber(main.humidity, 'humidity'),
    windSpeed: wind.speed ?? null,   // m/s; optional in provider response
    windDirection: wind.deg ?? null,
    windGust: wind.gust ?? null,
    pressureSurfaceLevel: requiredNumber(main.pressure, 'pressure'),
    cloudCover: requiredNumber(clouds.all, 'cloud cover'),
    uvIndex: null, // Not supplied by the free current-weather endpoint
    visibility: typeof data.visibility === 'number' ? data.visibility / 1000 : null, // m → km
    dewPoint: null, // Not supplied by the free current-weather endpoint
    precipitationProbability: null, // Current conditions do not include probability of precipitation
    weatherCode: owmToInternalCode(requiredNumber(weather.id, 'condition code')),
    rainVolume: data.rain?.['1h'] ?? data.rain?.['3h'] ?? 0,
    snowVolume: data.snow?.['1h'] ?? data.snow?.['3h'] ?? 0,
    description: weather.description ?? '',
    isNight: typeof weather.icon === 'string' && weather.icon.endsWith('n'),
  };
}

/** Map one OpenWeather 5-day/3-hour forecast item to a timeline interval. */
function mapHourlyItem(item: any): TimelineInterval {
  const main = item.main || {};
  const wind = item.wind || {};
  const clouds = item.clouds || {};
  const weather = item.weather?.[0] || {};
  return {
    startTime: item.dt_txt || new Date(item.dt * 1000).toISOString(),
    values: {
      temperature: requiredNumber(main.temp, 'forecast temperature'),
      temperatureApparent: requiredNumber(main.feels_like, 'forecast feels-like temperature'),
      humidity: requiredNumber(main.humidity, 'forecast humidity'),
      windSpeed: wind.speed ?? null,
      windDirection: wind.deg ?? null,
      windGust: wind.gust ?? null,
      pressureSurfaceLevel: requiredNumber(main.pressure, 'forecast pressure'),
      cloudCover: requiredNumber(clouds.all, 'forecast cloud cover'),
      uvIndex: null,
      visibility: typeof item.visibility === 'number' ? item.visibility / 1000 : null,
      dewPoint: null,
      precipitationProbability: item.pop == null ? null : Math.round(item.pop * 100),
      weatherCode: owmToInternalCode(requiredNumber(weather.id, 'forecast condition code')),
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

    const temps = dayItems.map((d: any) => requiredNumber(d.main?.temp, 'daily temperature'));
    const humidities = dayItems.map((d: any) => requiredNumber(d.main?.humidity, 'daily humidity'));
    const winds = dayItems.map((d: any) => d.wind?.speed).filter((v: unknown): v is number => typeof v === 'number' && Number.isFinite(v));
    const windDirs = dayItems.map((d: any) => d.wind?.deg).filter((v: unknown): v is number => typeof v === 'number' && Number.isFinite(v));
    const pops = dayItems
      .map((d: any) => d.pop)
      .filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value))
      .map((value: number) => Math.round(value * 100));
    // Use the most frequently reported condition. OpenWeather condition IDs
    // are categories, not an ordered severity scale.
    const conditionCounts = new Map<number, number>();
    for (const item of dayItems) {
      const id = requiredNumber(item.weather?.[0]?.id, 'daily condition code');
      conditionCounts.set(id, (conditionCounts.get(id) ?? 0) + 1);
    }
    const dominantId = [...conditionCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    if (dominantId == null) throw new Error('OpenWeather forecast day has no condition readings');

    dailyIntervals.push({
      startTime: `${date}T12:00:00Z`,
      values: {
        temperatureMax: Math.max(...temps),
        temperatureMin: Math.min(...temps),
        humidity: Math.round(humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length),
        windSpeed: winds.length ? Math.max(...winds) : null,
        windDirection: windDirs.length ? Math.round((((Math.atan2(windDirs.reduce((sum: number, deg: number) => sum + Math.sin(deg * Math.PI / 180), 0), windDirs.reduce((sum: number, deg: number) => sum + Math.cos(deg * Math.PI / 180), 0)) * 180 / Math.PI) + 360) % 360)) : null,
        precipitationProbability: pops.length ? Math.max(...pops) : null,
        weatherCode: owmToInternalCode(dominantId),
        uvIndex: null,
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
  const pressures = items.slice(0, 4)
    .map((d: any) => d.main?.pressure)
    .filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value));
  if (pressures.length < 3) return 'steady';
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
      aqi: item.main?.aqi ?? null,
      co: item.components?.co ?? null,
      no2: item.components?.no2 ?? null,
      o3: item.components?.o3 ?? null,
      pm2_5: item.components?.pm2_5 ?? null,
      pm10: item.components?.pm10 ?? null,
      so2: item.components?.so2 ?? null,
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
  if (weather.precipitationProbability != null) {
    if (weather.precipitationProbability > 60) score -= 3;
    else if (weather.precipitationProbability > 30) score -= 1;
  }
  // Wind penalty
  if (weather.windSpeed != null) {
    const windKmh = weather.windSpeed * 3.6;
    if (windKmh > 40) score -= 3;
    else if (windKmh > 25) score -= 1;
  }
  // Temperature penalty (too hot or cold)
  if (weather.temperature > 38 || weather.temperature < 0) score -= 3;
  else if (weather.temperature > 34 || weather.temperature < 5) score -= 1;
  // Visibility penalty
  if (weather.visibility != null) {
    if (weather.visibility < 1) score -= 2;
    else if (weather.visibility < 5) score -= 1;
  }
  // UV penalty
  if (weather.uvIndex != null && weather.uvIndex > 10) score -= 1;
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
    if (!Array.isArray(data)) return [];
    return data
      .filter((item: any) =>
        typeof item?.name === 'string' &&
        item.name.trim().length > 0 &&
        typeof item?.lat === 'number' &&
        Number.isFinite(item.lat) &&
        item.lat >= -90 &&
        item.lat <= 90 &&
        typeof item?.lon === 'number' &&
        Number.isFinite(item.lon) &&
        item.lon >= -180 &&
        item.lon <= 180
      )
      .map((item: any) => ({
        name: item.name.trim(),
        lat: item.lat,
        lon: item.lon,
        country: typeof item.country === 'string' ? item.country : '',
        state: typeof item.state === 'string' ? item.state : undefined,
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

  // OpenWeather's free forecast endpoint returns 3-hour intervals, not hourly data.
  // Keep the existing internal property name for compatibility with current screens.
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
