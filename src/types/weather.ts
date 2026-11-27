export interface WeatherValues {
  temperature: number;
  temperatureApparent: number;
  humidity: number;
  windSpeed: number | null;
  windDirection: number | null;
  windGust: number | null;
  pressureSurfaceLevel: number;
  cloudCover: number;
  uvIndex: number | null;
  visibility: number | null;
  dewPoint: number | null;
  precipitationProbability: number | null;
  weatherCode: number;
  rainVolume?: number | null;
  snowVolume?: number | null;
  description?: string;
  isNight?: boolean;
}

export interface TimelineInterval {
  startTime: string;
  values: WeatherValues;
}

export interface DailyValues {
  temperatureMax: number;
  temperatureMin: number;
  humidity: number;
  windSpeed: number | null;
  windDirection: number | null;
  precipitationProbability: number | null;
  weatherCode: number;
  uvIndex: number | null;
  sunriseTime: string;
  sunsetTime: string;
}

export interface DailyInterval {
  startTime: string;
  values: DailyValues;
}

export interface AirQuality {
  aqi: number | null; // 1-5 (Good, Fair, Moderate, Poor, Very Poor)
  co: number | null;
  no2: number | null;
  o3: number | null;
  pm2_5: number | null;
  pm10: number | null;
  so2: number | null;
}

export interface WeatherData {
  current: WeatherValues;
  hourly: TimelineInterval[];
  daily: DailyInterval[];
  location: {
    lat: number;
    lon: number;
    name: string;
  };
  sunriseTime?: string;
  sunsetTime?: string;
  dataTimestamp?: number;
  pressureTrend?: 'rising' | 'falling' | 'steady';
  airQuality?: AirQuality;
  timezoneOffset?: number; // seconds offset from UTC
  cityTempMin?: number;
  cityTempMax?: number;
  seaLevelPressure?: number;
  comfortIndex?: 'Comfortable' | 'Muggy' | 'Dry' | 'Hot' | 'Cold';
  outdoorScore?: number; // 0-10
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}
