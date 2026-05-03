export const API_BASE_URL = 'https://api.openweathermap.org';

// OpenWeatherMap condition ID → internal weather code (Tomorrow.io-compatible)
// Ref: https://openweathermap.org/weather-conditions
export function owmToInternalCode(owmId: number): number {
  // Thunderstorm group (2xx)
  if (owmId >= 200 && owmId < 300) return 8000;
  // Drizzle group (3xx)
  if (owmId >= 300 && owmId < 310) return 4000; // light drizzle
  if (owmId >= 310 && owmId < 400) return 4200; // heavy drizzle → light rain
  // Rain group (5xx)
  if (owmId === 500) return 4200; // light rain
  if (owmId === 501) return 4001; // moderate rain
  if (owmId === 502 || owmId === 503 || owmId === 504) return 4201; // heavy rain
  if (owmId === 511) return 6001; // freezing rain
  if (owmId === 520) return 4200; // light shower
  if (owmId === 521) return 4001; // shower
  if (owmId === 522 || owmId === 531) return 4201; // heavy shower
  // Snow group (6xx)
  if (owmId === 600) return 5100; // light snow
  if (owmId === 601) return 5000; // snow
  if (owmId === 602) return 5101; // heavy snow
  if (owmId === 611 || owmId === 612 || owmId === 613) return 7000; // sleet/ice
  if (owmId === 615 || owmId === 616) return 6200; // rain + snow
  if (owmId === 620) return 5100; // light snow shower
  if (owmId === 621) return 5001; // snow shower
  if (owmId === 622) return 5101; // heavy snow shower
  // Atmosphere group (7xx)
  if (owmId === 701 || owmId === 741) return 2100; // mist/fog
  if (owmId === 711) return 2100; // smoke
  if (owmId === 721) return 2100; // haze
  if (owmId === 731 || owmId === 761) return 3000; // dust → light wind
  if (owmId === 751) return 3000; // sand
  if (owmId === 762) return 2000; // volcanic ash → dense fog
  if (owmId === 771) return 3002; // squall → strong wind
  if (owmId === 781) return 8000; // tornado → thunderstorm
  // Clear (800)
  if (owmId === 800) return 1000;
  // Clouds (80x)
  if (owmId === 801) return 1100; // few clouds → mostly clear
  if (owmId === 802) return 1101; // scattered → partly cloudy
  if (owmId === 803) return 1102; // broken → mostly cloudy
  if (owmId === 804) return 1001; // overcast
  return 1000; // fallback clear
}

// Weather code to condition mapping (Tomorrow.io codes)
export const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  1000: { label: 'Clear', icon: '☀️' },
  1001: { label: 'Cloudy', icon: '☁️' },
  1100: { label: 'Mostly Clear', icon: '🌤️' },
  1101: { label: 'Partly Cloudy', icon: '⛅' },
  1102: { label: 'Mostly Cloudy', icon: '🌥️' },
  2000: { label: 'Fog', icon: '🌫️' },
  2100: { label: 'Light Fog', icon: '🌫️' },
  3000: { label: 'Light Wind', icon: '🍃' },
  3001: { label: 'Wind', icon: '💨' },
  3002: { label: 'Strong Wind', icon: '💨' },
  4000: { label: 'Drizzle', icon: '🌦️' },
  4001: { label: 'Rain', icon: '🌧️' },
  4200: { label: 'Light Rain', icon: '🌦️' },
  4201: { label: 'Heavy Rain', icon: '🌧️' },
  5000: { label: 'Snow', icon: '🌨️' },
  5001: { label: 'Flurries', icon: '🌨️' },
  5100: { label: 'Light Snow', icon: '🌨️' },
  5101: { label: 'Heavy Snow', icon: '❄️' },
  6000: { label: 'Freezing Drizzle', icon: '🧊' },
  6001: { label: 'Freezing Rain', icon: '🧊' },
  6200: { label: 'Light Freezing Rain', icon: '🧊' },
  6201: { label: 'Heavy Freezing Rain', icon: '🧊' },
  7000: { label: 'Ice Pellets', icon: '🧊' },
  7101: { label: 'Heavy Ice Pellets', icon: '🧊' },
  7102: { label: 'Light Ice Pellets', icon: '🧊' },
  8000: { label: 'Thunderstorm', icon: '⛈️' },
};

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
