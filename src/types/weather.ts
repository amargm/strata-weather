export interface WeatherValues {
  temperature: number;
  temperatureApparent: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  pressureSurfaceLevel: number;
  cloudCover: number;
  uvIndex: number;
  visibility: number;
  dewPoint: number;
  precipitationProbability: number;
  weatherCode: number;
  rainVolume?: number;
  snowVolume?: number;
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
  windSpeed: number;
  windDirection: number;
  precipitationProbability: number;
  weatherCode: number;
  uvIndex: number;
  sunriseTime: string;
  sunsetTime: string;
}

export interface DailyInterval {
  startTime: string;
  values: DailyValues;
}

export interface AirQuality {
  aqi: number; // 1-5 (Good, Fair, Moderate, Poor, Very Poor)
  co: number;
  no2: number;
  o3: number;
  pm2_5: number;
  pm10: number;
  so2: number;
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
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}
