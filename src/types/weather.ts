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

export interface WeatherData {
  current: WeatherValues;
  hourly: TimelineInterval[];
  daily: DailyInterval[];
  location: {
    lat: number;
    lon: number;
    name: string;
  };
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}
