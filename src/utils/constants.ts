export const API_BASE_URL = 'https://api.tomorrow.io/v4';

export const WEATHER_FIELDS = [
  'temperature',
  'temperatureApparent',
  'humidity',
  'windSpeed',
  'windDirection',
  'windGust',
  'pressureSurfaceLevel',
  'cloudCover',
  'uvIndex',
  'visibility',
  'dewPoint',
  'precipitationProbability',
  'weatherCode',
];

// Weather code to condition mapping (Tomorrow.io codes)
export const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  1000: { label: 'Clear', icon: '☀️' },
  1001: { label: 'Cloudy', icon: '☁️' },
  1100: { label: 'Mostly Clear', icon: '🌤' },
  1101: { label: 'Partly Cloudy', icon: '⛅' },
  1102: { label: 'Mostly Cloudy', icon: '🌥' },
  2000: { label: 'Fog', icon: '🌫' },
  2100: { label: 'Light Fog', icon: '🌫' },
  3000: { label: 'Light Wind', icon: '💨' },
  3001: { label: 'Wind', icon: '💨' },
  3002: { label: 'Strong Wind', icon: '💨' },
  4000: { label: 'Drizzle', icon: '🌦' },
  4001: { label: 'Rain', icon: '🌧' },
  4200: { label: 'Light Rain', icon: '🌦' },
  4201: { label: 'Heavy Rain', icon: '🌧' },
  5000: { label: 'Snow', icon: '❄️' },
  5001: { label: 'Flurries', icon: '🌨' },
  5100: { label: 'Light Snow', icon: '🌨' },
  5101: { label: 'Heavy Snow', icon: '❄️' },
  6000: { label: 'Freezing Drizzle', icon: '🧊' },
  6001: { label: 'Freezing Rain', icon: '🧊' },
  6200: { label: 'Light Freezing Rain', icon: '🧊' },
  6201: { label: 'Heavy Freezing Rain', icon: '🧊' },
  7000: { label: 'Ice Pellets', icon: '🧊' },
  7101: { label: 'Heavy Ice Pellets', icon: '🧊' },
  7102: { label: 'Light Ice Pellets', icon: '🧊' },
  8000: { label: 'Thunderstorm', icon: '⛈' },
};

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
